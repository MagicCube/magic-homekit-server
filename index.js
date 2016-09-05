import logger from "winston";

import HttpClientPushSensor from "./lib/sensor/http/HttpClientPushSensor";
import HttpServerPullSensor from "./lib/sensor/http/HttpServerPullSensor";

import server from "./lib/server";

import config from "./config";
import sensors from "./sensors";

let storage = null;

async function startup()
{
    line(); console.log("* Hello from MaigcHomekit *"); line();

    setupLogger();
    logger.info("MaigcHomekit server is now starting...");

    server.setup();

    await setupStorage();

    await setupSensors();
    line(); logger.info("Congratulations! MaigcHomekit is now running.");
}

function setupLogger()
{
    logger.remove(logger.transports.Console);
    logger.add(logger.transports.Console, {
        timestamp: () => new Date().toString().substr(0, 24),
        colorize: true
    });
}

async function setupStorage()
{
    try
    {
        storage = require("./lib/storage");
        if (storage.default)
        {
            // In ES6, use storage.default
            storage = storage.default;
        }
        logger.info("Connecting to the default database...");
        await storage.connection.connect();
        logger.info("Database connected.");
    }
    catch (err)
    {
        logger.error(err);
        logger.error("Fail to connect to the default database.");
        logger.info("Server is going to stop.");
        process.exit();
    }
}

async function setupSensors()
{
    logger.info("Loading sensors...");
    let s = null;
    for (let i = 0; i < sensors.length; i++)
    {
        s = sensors[i];
        logger.info(`- [${s.name}]`);
        let sensor = null;
        try
        {
            if (s.monitor.mode === "http-server-pull")
            {
                sensor = new HttpServerPullSensor(s);
            }
            else if (s.monitor.mode === "http-client-push")
            {
                sensor = new HttpClientPushSensor(s);
            }
            else
            {
                throw new Error(`"${s.monitor.mode}" is not a supported sensor monitor mode. Try "http-server-pull" or "http-client-push".`);
            }
        }
        catch (err)
        {
            logger.error(err);
            throw new Error(`Error ocurs when create sensor "${s.name}".`);
        }

        const sensorStorage = new storage.SensorStorage(storage.connection);
        try
        {
            await sensorStorage.bind(sensor);
        }
        catch (err)
        {
            logger.error(err);
            throw new Error(`Error ocurs when binding SensorStorage to sensor "${s.name}".`);
        }

        if (sensor.startMonitor)
        {
            sensor.startMonitor();
        }
    }
}

function line()
{
    console.log("*".repeat(80));
}


startup();
