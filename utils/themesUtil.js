import * as fs from "node:fs"
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const themesData = {}
const selectingThemes = null
const DIR_PATH = "/jsonFiles"
const filenames =  fs.readdirSync(__dirname+DIR_PATH)

for (let filename of filenames) {
    let themeName = filename.split(".")[0]
    let filePath = __dirname + `${DIR_PATH}/${themeName}.json`
    // console.log(`There exists a directory which is ${path}`)
    let jsonData = fs.readFileSync(filePath, 'utf-8', (err, jsonString) => {
        return jsonString
    })
    if (!selectingThemes || selectingThemes.includes(themeName)) themesData[themeName] = JSON.parse(jsonData)
}


fs.writeFileSync(__dirname+"/allThemes.json", JSON.stringify(themesData))

export default themesData
