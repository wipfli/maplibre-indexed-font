import json

f = open("tests.geojson")

tests = json.load(f)

def encode(name):
    result = str(name)
    glyphs = json.load(open("glyphs.json"))
    segments = {}
    for key in glyphs:
        segments[glyphs[key]["segment"]] = int(key)
    # print(segments)

    for segment in segments:
        if segment in result:
            result = result.replace(segment, chr(segments[segment]))

    return result


for feature in tests['features']:
    native_name = feature['properties']['native_name']
    feature['properties']['native_name_encoded'] = encode(native_name)

with open('tests_encoded.geojson', 'w') as f:
    json.dump(tests, f)
