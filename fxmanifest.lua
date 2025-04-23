fx_version 'cerulean'
game 'gta5'

description 'QBCore Dev HUD - Custom HUD UI'
version '1.0.0'

author 'YourNameHere'

client_scripts {
    'client/client.lua',
    'config.lua'
}

server_scripts {
    'server/server.lua',
    'config.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/settings.html',
    'html/hud.js',
    'html/settings.js',
    'html/hud.css',
    'html/assets/**',
}