import { existsSync, readFileSync } from "fs";

export class Configuration {
  data = {}

  Get(key) {
    return this.data[key];
  }

  get Log() {
    const levels = "none, error, info, debug";
    return levels.indexOf(this.data["logLevel"]);
  }

  get Word() {
    let _words = this.Get("words").split(" ").map(word => word.trim()).filter(word => word.length > 0 && word != null);
    return _words[Math.floor(Math.random() * _words.length - 1)]
  }

  constructor() {
    let defaultConfig = this.loadFile("./config/default.json"); 
    let localConfig = this.loadFile("./config/local.json");
    let productionConfig = this.loadFile("./config/production.json");

    this.data = Object.assign(defaultConfig, localConfig, productionConfig);
    if (this.Log > 2) {
      console.log(this.data);
    }
  }

    loadFile(filepath) {
        if (existsSync(filepath)) {
            let _data = readFileSync(filepath);
            try {
                return JSON.parse(_data);
            } catch (e) { }
        }
    }
}
