import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { URL } from "url";
import { Log } from "./Log.js";

/**
 * @class Configuration
 * @description
 * Configuration class is used to load configuration files and provide
 * access to the configuration values.
 *
 * If you would like to overload a configuration option by name simply define it in the context of the runtime environment.
 **/
export class Configuration {
  data = {};

  ResolveFilepath(filepath) {
    return resolve(process.cwd(), filepath);
  }

  Get(key) {
    try {
      if (process.env.hasOwnProperty(key)) {
        return process.env[key];
      }
    } catch (e) {}
    return this.data[key];
  }

  // NOTE: Two hardest things in programming:
  // * Naming things,
  // * Cache-invalidation
  // * Off-by-one errors
  get Log() {
    const levels = "none,error,info,debug".split(',');
    return levels.indexOf(this.data["logLevel"]) + 1;
  }

  get Word() {
    let _words = this.Get("words")
      .split(" ")
      .map((word) => word.trim())
      .filter((word) => word.length > 0 && word != null);
    return _words[Math.floor(Math.random() * _words.length - 1)];
  }

  constructor() {
    let defaultConfig = this.loadFile("./config/default.json");
    let localConfig = this.loadFile("./config/local.json");
    let productionConfig = this.loadFile("./config/production.json");

    this.data = Object.assign(defaultConfig, localConfig, productionConfig);
    if (this.Log > 3) {
      Log.Log("Configuration", this.data);
    }
  }

  loadFile(filepath) {
    let loadFilePath = this.ResolveFilepath(filepath)
    if (existsSync(loadFilePath)) {
      let _data = readFileSync(loadFilePath, "utf8");
      try {
        return JSON.parse(_data);
      } catch (e) {}
    }
    return {};
  }
}
