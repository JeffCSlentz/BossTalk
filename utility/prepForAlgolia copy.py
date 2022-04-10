import json

#print(os.getcwd())
def main():
    res = []
    with open('data/creatureSounds.json') as f:
        data = json.load(f)
    
    for creature in data:
        for sound in creature[1]["sounds"]:
            algolia_object = {
                "creatureName" : sound["creatureName"],
                "filePath" : sound["filePath"],
                "id": 16,
                "expansion": sound["position"]["expansion"],
                "location": sound["position"]["location"]}
            res.append(algolia_object)
            
    with open ("./data/dataForAlgolia.json", "w") as f:
        f.write(json.dumps(res))

if __name__ == "__main__":
    main()