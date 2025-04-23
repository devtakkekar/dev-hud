-- QBCore Dev HUD: Real-time HUD Update Logic

local QBCore = exports['qb-core']:GetCoreObject()

-- Utility function to send data to NUI
local function updateHud(data)
    SendNUIMessage({
        action = 'updateHUD',
        name = data.name,
        health = data.health,
        armor = data.armor,
        stamina = data.stamina
    })
end

-- Helper: Check if player is downed (QBCore export)
local function isPlayerDowned()
    if QBCore and QBCore.Functions and QBCore.Functions.GetPlayerData then
        local PlayerData = QBCore.Functions.GetPlayerData()
        if PlayerData and PlayerData.metadata and PlayerData.metadata['inlaststand'] then
            return PlayerData.metadata['inlaststand']
        end
    end
    return false
end

-- Helper: Get character full name from QBCore PlayerData
local function getCharacterName()
    if QBCore and QBCore.Functions and QBCore.Functions.GetPlayerData then
        local PlayerData = QBCore.Functions.GetPlayerData()
        if PlayerData and PlayerData.charinfo then
            local first = PlayerData.charinfo.firstname or ''
            local last = PlayerData.charinfo.lastname or ''
            return (first .. ' ' .. last):gsub('^%s*(.-)%s*$', '%1')
        end
    end
    return GetPlayerName(PlayerId())
end

-- Utility function to get player stamina (0-100, 100 = full)
local function getPlayerStamina()
    local ped = PlayerPedId()
    if ped and DoesEntityExist(ped) then
        local stamina = GetPlayerSprintStaminaRemaining(PlayerId())
        return math.floor(stamina) -- native already returns 0-100
    end
    return 100
end

-- Main HUD update loop
CreateThread(function()
    while true do
        local player = PlayerPedId()
        local rawHealth = GetEntityHealth(player)
        local health = 0
        if rawHealth > 100 then
            health = math.floor(((rawHealth - 100) / 100) * 100)
        end
        -- Set health to 0 if dead or downed (laststand)
        if IsEntityDead(player) or rawHealth <= 101 or isPlayerDowned() then
            health = 0
        end
        local armor = GetPedArmour(player)
        local name = getCharacterName()
        local stamina = getPlayerStamina()

        -- Hide default GTA HUD bars, show only map
        for i = 1, 22 do
            if i ~= 13 then -- 13 is the minimap, don't hide
                HideHudComponentThisFrame(i)
            end
        end
        HideHudComponentThisFrame(23) -- Weapon stat
        HideHudComponentThisFrame(24) -- Save icon (additional, just in case)
        HideHudComponentThisFrame(25) -- Mute icon (additional)

        updateHud({
            name = name,
            health = health,
            armor = armor,
            stamina = stamina
        })
        Wait(200)
    end
end)

-- Blinker controls using FiveM control IDs
-- MINUS: 137, EQUALS: 138, BACKSPACE: 194
local LEFT_BLINKER_CONTROL = 84
local RIGHT_BLINKER_CONTROL = 83
local HAZARD_BLINKER_CONTROL = 194

local leftBlinker = false
local rightBlinker = false
local hazardBlinker = false
local prevHazard = false

-- Blinker state for HUD sync
local blinkerFlashState = false
local blinkerTimer = 0
local BLINKER_INTERVAL = 500 -- ms, matches GTA default blinker rate

-- Send blinker state to NUI
local function sendBlinkerState(left, right, hazard)
    SendNUIMessage({
        action = 'setBlinkers',
        left = left,
        right = right,
        hazard = hazard
    })
end

CreateThread(function()
    while true do
        Wait(0)
        if IsPedInAnyVehicle(PlayerPedId(), false) then
            local veh = GetVehiclePedIsIn(PlayerPedId(), false)
            -- Left blinker (minus key)
            if IsControlJustPressed(0, LEFT_BLINKER_CONTROL) then
                leftBlinker = not leftBlinker
                rightBlinker = false
                hazardBlinker = false
            end
            -- Right blinker (equals key)
            if IsControlJustPressed(0, RIGHT_BLINKER_CONTROL) then
                rightBlinker = not rightBlinker
                leftBlinker = false
                hazardBlinker = false
            end
            -- Hazard lights (backspace)
            if IsControlJustPressed(0, HAZARD_BLINKER_CONTROL) then
                hazardBlinker = not hazardBlinker
                leftBlinker = false
                rightBlinker = false
            end
            -- Blinker logic
            if hazardBlinker ~= prevHazard then
                sendBlinkerState(leftBlinker, rightBlinker, hazardBlinker)
                prevHazard = hazardBlinker
            end
            if hazardBlinker then
                SetVehicleIndicatorLights(veh, 0, true) -- Right
                SetVehicleIndicatorLights(veh, 1, true) -- Left
            else
                SetVehicleIndicatorLights(veh, 0, rightBlinker)
                SetVehicleIndicatorLights(veh, 1, leftBlinker)
            end

            -- Blinker flashing logic for HUD sync
            if leftBlinker or rightBlinker or hazardBlinker then
                if GetGameTimer() - blinkerTimer > BLINKER_INTERVAL then
                    blinkerFlashState = not blinkerFlashState
                    blinkerTimer = GetGameTimer()
                    SendNUIMessage({
                        action = 'setBlinkers',
                        left = leftBlinker and blinkerFlashState,
                        right = rightBlinker and blinkerFlashState,
                        hazard = hazardBlinker and blinkerFlashState
                    })
                end
            else
                if blinkerFlashState then
                    blinkerFlashState = false
                    SendNUIMessage({
                        action = 'setBlinkers',
                        left = false,
                        right = false,
                        hazard = false
                    })
                end
            end
        else
            if blinkerFlashState then
                blinkerFlashState = false
                SendNUIMessage({
                    action = 'setBlinkers',
                    left = false,
                    right = false,
                    hazard = false
                })
            end
        end
    end
end)

AddEventHandler('dev-hud:leftblinker', function()
    leftBlinker = not leftBlinker
    rightBlinker = false
    hazardBlinker = false
    sendBlinkerState(leftBlinker, rightBlinker, hazardBlinker)
end)
AddEventHandler('dev-hud:rightblinker', function()
    rightBlinker = not rightBlinker
    leftBlinker = false
    hazardBlinker = false
    sendBlinkerState(leftBlinker, rightBlinker, hazardBlinker)
end)

-- Enhanced Speedometer NUI update (street names, fuel, gear, rpm, engine, seatbelt, efficient update)
local LastSpeed, LastRpm, LastEngine, LastLight, LastSeatbelt, LastFuel = 0, 0, 0, false, false, 0
local LastStreet1, LastStreet2 = '', ''
local lastFuelUpdate = 0

function getFuelLevel(vehicle)
    local updateTick = GetGameTimer()
    if (updateTick - lastFuelUpdate) > 2000 then
        lastFuelUpdate = updateTick
        LastFuel = math.floor(GetVehicleFuelLevel(vehicle) or 0)
    end
    return LastFuel
end

CreateThread(function()
    while true do
        local wait = 300
        local ped = PlayerPedId()
        if DoesEntityExist(ped) and not IsEntityDead(ped) and IsPedInAnyVehicle(ped, false) then
            local veh = GetVehiclePedIsIn(ped, false)
            if veh then
                local speed = math.ceil(GetEntitySpeed(veh) * 3.6)
                local rpm = GetVehicleCurrentRpm(veh)
                local fuel = getFuelLevel(veh)
                local engine = GetIsVehicleEngineRunning(veh)
                local engineHealth = GetVehicleEngineHealth(veh) / 10
                local seatbelt = false -- Add your seatbelt logic if available
                local gear = GetVehicleCurrentGear(veh)
                if (speed == 0 and gear == 0) or (speed == 0 and gear == 1) then gear = 'N' elseif speed > 0 and gear == 0 then gear = 'R' end
                local light = false
                local _, lightOn, highBeams = GetVehicleLightsState(veh)
                if lightOn == 1 then light = true end
                -- Street names
                local coords = GetEntityCoords(ped)
                local street1, street2 = GetStreetNameAtCoord(coords.x, coords.y, coords.z, Citizen.ResultAsInteger(), Citizen.ResultAsInteger())
                local streetName1 = GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z))
                local streetName2 = GetStreetNameFromHashKey(street1)
                -- Only update if something changed
                if LastSpeed ~= speed or LastRpm ~= rpm or LastFuel ~= fuel or LastEngine ~= engine or LastLight ~= light or LastSeatbelt ~= seatbelt or LastStreet1 ~= streetName1 or LastStreet2 ~= streetName2 then
                    SendNUIMessage({
                        action = 'setSpeedometer',
                        show = true,
                        speed = speed,
                        rpm = rpm,
                        gear = gear,
                        fuel = fuel,
                        engine = engine,
                        engineHealth = engineHealth,
                        seatbelt = seatbelt,
                        light = light,
                        street1 = streetName1,
                        street2 = streetName2
                    })
                    LastSpeed, LastRpm, LastFuel, LastEngine, LastLight, LastSeatbelt = speed, rpm, fuel, engine, light, seatbelt
                    LastStreet1, LastStreet2 = streetName1, streetName2
                end
                wait = 90
            end
        else
            SendNUIMessage({action = 'setSpeedometer', show = false})
            wait = 650
        end
        Citizen.Wait(wait)
    end
end)

RegisterNUICallback('hudReady', function(_, cb)
    TriggerEvent('QBCore:Client:OnPlayerLoaded')
    cb('ok')
end)