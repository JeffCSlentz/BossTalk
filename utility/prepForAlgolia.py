import json

#print(os.getcwd())
def main():
    res = []
    with open('data/creatureSounds.json') as f:
        data = json.load(f)
    
    for creature in data:
        algolia_object = {
            "creatureName" : creature[0],
            "positions" : [],
            "sounds" : []
        }
        temp_set = set()
        for sound in creature[1]["sounds"]:
            algolia_object["sounds"].append({
                "filePath": sound["filePath"],
                "id": sound["id"],
                "expansion": sound["position"]["expansion"],
                "location": sound["position"]["location"]
            })
            temp_set.add((sound["position"]["expansion"],sound["position"]["location"]))

        for position in temp_set:
            algolia_object["positions"].append({
                "expansion": position[0],
                "location": position[1]
            })
        res.append(algolia_object)
    with open ("./data/dataForAlgolia.json", "w") as f:
        f.write(json.dumps(res))

if __name__ == "__main__":
    main()