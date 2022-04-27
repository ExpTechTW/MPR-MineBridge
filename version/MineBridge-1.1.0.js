'use strict'

const Plugin = {
    "name": "MineBridge",
    "version": "1.1.0",
    "depends": {
        "pluginLoader": ">=4.7.0",
        "DataBase": ">=1.1.0",
        "UUID": ">=1.0.1"
    },
    "Events": ["messageCreate", "ready"],
    "Commands": [
        {
            "name": "minebridge here",
            "note": "設定 MineBridge 工作頻道",
            "permission": 3
        }
    ],
    "author": ["whes1015"],
    "link": "https://github.com/ExpTechTW/MPR-MineBridge",
    "resources": ["AGPL-3.0"],
    "description": "Minecraft 聊天橋梁",
    "DHL": false
}

const DB = require("./DataBase")
const pluginLoader = require('../Core/pluginLoader')
const UUID = require('./UUID')
const config = require('../config')
const WebSocket = require('ws')
var ws
let Client
let Uuid

async function ready(client) {
    if (DB.read(Plugin, "UUID") == false || DB.read(Plugin, "UUID") == null) {
        DB.write(Plugin, "UUID", UUID.uuid())
    }
    Uuid = DB.read(Plugin, "UUID")
    if (client != undefined) Client = client
}

async function messageCreate(client, message) {
    Client = client
    if (message.content == "minebridge here") {
        DB.write(Plugin, "channel", message.channel.id)
        await message.reply(await pluginLoader.embed("已設定此頻道為 MineBridge 工作頻道"))
    } else if (await DB.read(Plugin, "channel") == message.channel.id && client.user.id != message.author.id) {
        ws.send(JSON.stringify({
            "APIkey": "a5ef9cb2cf9b0c14b6ba71d0fc39e329",
            "Function": "MineBridge",
            "Type": "data",
            "FormatVersion": 1,
            "UUID": Uuid,
            "Value": {
                "function": "discord",
                "text": `${message.member.displayName} >> ${message.content}`
            }
        }))
    }
}

async function connect() {
    ws = new WebSocket(config.API_WebSocket);
    ws.onopen = function () {
        let Data = {
            "APIkey": "a5ef9cb2cf9b0c14b6ba71d0fc39e329",
            "Function": "MineBridge",
            "Type": "connect",
            "FormatVersion": 1,
            "UUID": Uuid
        }
        ws.send(JSON.stringify(Data))
    };

    ws.onmessage = async function (e) {
        let Data = JSON.parse(e.data.toString())
        if (Data["response"] == "You have successfully subscribed to MineBridge") {
            pluginLoader.log("Info >> MineBridge 已連線 UUID: " + Uuid)
        } else {
            console.log(Data)
            if (Data["function"] == "on_user_info") {
                Client.channels.cache.get(await DB.read(Plugin, "channel")).send(`${Data["player"]} >> ${Data["text"]}`)
            } else if (Data["function"] == "on_player_joined") {
                Client.channels.cache.get(await DB.read(Plugin, "channel")).send(await pluginLoader.embed(`**${Data["player"]} 加入 伺服器**`, "#00FF00"))
            } else if (Data["function"] == "on_player_left") {
                Client.channels.cache.get(await DB.read(Plugin, "channel")).send(await pluginLoader.embed(`**${Data["player"]} 離開 伺服器**`, "#E60000"))
            } else if (Data["function"] == "on_server_startup") {
                Client.channels.cache.get(await DB.read(Plugin, "channel")).send(`**-----伺服器 已啟動-----**`)
            }
        }
    }

    ws.onclose = function (e) {
        pluginLoader.log('Error >> 連線已中斷: 正在嘗試重新連線 ', e.reason)
        setTimeout(function () {
            connect()
        }, 1000)
    }

    ws.onerror = function (err) {
        pluginLoader.log('Error >> 連線錯誤: 正在嘗試重新連線 ' + err.message)
        ws.close()
    }
}

connect()

module.exports = {
    Plugin,
    messageCreate,
    ready
}
