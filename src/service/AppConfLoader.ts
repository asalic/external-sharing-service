import fs from "node:fs";
import { type  AppConf } from '../model/config/AppConf.js';


export default class AppConfLoader {

    static getAppConf(settingsPath: string): AppConf {
        return JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf8', flag: 'r' }));
    }

}