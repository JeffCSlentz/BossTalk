import { getVoiceConnection, createAudioPlayer, createAudioResource, StreamType, VoiceConnectionStatus, AudioPlayer } from '@discordjs/voice';
import { Readable } from 'stream';
import logger, { formatError } from '../logger';

// AudioPlayer emits 'error' on a failed/aborted resource (e.g. a demux
// failure) — with zero listeners that's an unhandled EventEmitter error,
// which can crash the process and definitely won't surface *why* playback
// silently produced no sound. Attach once per player (subscriptions are
// reused across plays within a guild) and log state transitions too, so a
// stuck/AutoPaused player is visible instead of just "no audio, no error".
function instrument(player: AudioPlayer): AudioPlayer {
  if (player.listenerCount('error') === 0) {
    player.on('error', (err) => logger.error(`AudioPlayer error: ${formatError(err)}`));
    player.on('stateChange', (oldState, newState) => {
      logger.debug(`AudioPlayer ${oldState.status} -> ${newState.status}`);
    });
  }
  return player;
}

/**
 * Streams a sound straight from R2 into the voice connection — no local disk.
 *
 * Originally written to assume Ogg/Opus passthrough (no ffmpeg) per the
 * uploader's README, on the premise that padAudio() output real Opus. It
 * doesn't — sox's `.ogg` output defaults to Vorbis, confirmed by inspecting
 * the codec ID bytes of an actual uploaded file (`\x01vorbis`, not
 * `OpusHead`). @discordjs/voice's OggOpus demuxer silently produces zero
 * packets (no error) when handed a non-Opus codec inside a valid Ogg
 * container, which is exactly what caused playback to go through with no
 * audio and no error. StreamType.Arbitrary routes through ffmpeg
 * (ffmpeg-static) to transcode instead. Revisit if the uploader's padAudio
 * step is ever changed to actually encode Opus.
 */
export async function playUrl(guildId: string, r2Url: string): Promise<boolean> {
  const connection = getVoiceConnection(guildId);
  if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
    logger.warn(`playUrl: no active voice connection for guild ${guildId}`);
    return false;
  }

  if (!connection.state.subscription) {
    connection.subscribe(instrument(createAudioPlayer()));
  } else {
    instrument(connection.state.subscription.player);
  }

  let response: Response;
  try {
    response = await fetch(r2Url);
  } catch (err) {
    logger.error(`playUrl: fetch threw for ${r2Url}: ${formatError(err)}`);
    return false;
  }
  if (!response.ok || !response.body) {
    logger.error(`playUrl: failed to fetch sound from R2 (${response.status}): ${r2Url}`);
    return false;
  }

  const resource = createAudioResource(Readable.fromWeb(response.body as never), {
    inputType: StreamType.Arbitrary,
  });

  if (!connection.state.subscription) {
    logger.error('playUrl: voice connection lost its subscription before playback started');
    return false;
  }
  connection.state.subscription.player.play(resource);
  logger.info(`playUrl: playing ${r2Url} (guild ${guildId}, player status: ${connection.state.subscription.player.state.status})`);
  return true;
}
