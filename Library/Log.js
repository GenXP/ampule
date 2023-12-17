import { createLogger, format, transports } from 'winston';
import LokiTransport from 'winston-loki';

let ampule_loki_url = "";

if (process.env.AMPULE_LOKI_URL) {
  ampule_loki_url = process.env.AMPULE_LOKI_URL;
}

const AMPULE_LOKI_URL = ampule_loki_url;

export class Log {
  static _instance = null;

  _logger = null;

  static get Instance() {
    if (this._instance == null) {
      this._instance = new Log();
      this._instance.configureLogger();
    }
    return this._instance;
  }

  construct() {
  }

  configureLogger() {
    this._logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`+(info.splat!==undefined?`${info.splat}`:" "))
      ),
      transports: [
        new transports.Console({timestamp: true})
      ]
    });

    if (AMPULE_LOKI_URL) {
      this._logger.add(new LokiTransport({
        host: AMPULE_LOKI_URL,
        labels: { app: 'ampule' },
        tags: ['ampule'],
        format: format.combine(
          format.timestamp(),
          format.json()
        )
      }))
    }
  }

  static Log(tag, ...args) {
    Log.Instance.Log("info", tag, ...args);
  }

  static Error(tag, ...args) {
    Log.Instance.Log("error", tag, ...args);
  }

  Log(level, tag, ...args) {
    if (!this._logger) {
      Log.Instance.configureLogger();
    }
    let message = "";
    let meta = {};
    if (typeof args[0] == "string") {
      message = args[0];
      if (args.length > 1) {
        meta = args.slice(1);
      }
    }
    if (typeof args[0] == "object" && args[0].message) {
      message = args[0].message;
      if (args.length === 1) {
        meta = args[0];
      } else {
        meta = args.slice(1);
      }
    }
    if (level == null || level == undefined || level == "") {
      level = "info";
    }

    let entry = {
      level,
      message,
      tags: [tag],
      meta
    };

    this._logger.log(entry);
  }
}
