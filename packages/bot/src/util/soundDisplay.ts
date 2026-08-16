// objectID is the R2 key minus the `sounds/` prefix and `.ogg` suffix
// (see @bosstalk/shared's objectIDFromFileKey), e.g. "creature/aargoss/vo_71_aargoss_01_m".
export function fileNameFromObjectId(objectID: string): string {
  return `${objectID.split('/').pop()}.ogg`;
}

export function fileNameFromR2Url(r2Url: string): string {
  return decodeURIComponent(r2Url.split('/').pop() ?? r2Url);
}
