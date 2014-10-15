﻿$(document).ready(function () {
    StartUpdate();
});

function StartUpdate() {
    $("#YouTrackItemList").empty();

    $.ajax({
        type: "Get",
        url: "/Data/Configuration.json",
        dataType: "json",
        headers: {
            accept: 'application/json'
        },
        success: function (jsonData) {
            UpdateYouTrackData(jsonData);
        }
    });
    
    window.setTimeout(function () { StartUpdate(); }, 300000);
}

function UpdateYouTrackData(jsonData) {
    var countUrls = [];
    var latestItemsUrl = "";
    var states = [];
    
    for (var key in jsonData) {
        if (key == "LatestItemsUrl") {
            latestItemsUrl = jsonData[key];
        } else if (key == "CountUrls") {
            var boardInformations = jsonData[key];
            
            for (var boardInformation in boardInformations) {
                var name = "";
                var url = "";
                for (var boardInformationKey in boardInformations[boardInformation]) {
                    if (boardInformationKey == "Name")
                        name = boardInformations[boardInformation][boardInformationKey];
                    if (boardInformationKey == "Url")
                        url = boardInformations[boardInformation][boardInformationKey];
                }
                countUrls[name] = url;                
            }
        } else if (key == "States") {
            var stateInformations = jsonData[key];

            for (var stateInformation in stateInformations) {
                var displayName = "";
                var actualName = "";
                for (var stateInformationKey in stateInformations[stateInformation]) {
                    if (stateInformationKey == "Name")
                        actualName = stateInformations[stateInformation][stateInformationKey];
                    if (stateInformationKey == "DisplayName")
                        displayName = stateInformations[stateInformation][stateInformationKey];
                }
                states[actualName] = displayName;
            }
        }
    }
    
    GetLatestUpdatedItems(latestItemsUrl);
    for (var countUrl in countUrls)
        CountYouTrackItemsOnBoard(countUrl, countUrls[countUrl], states);
}

function GetLatestUpdatedItems(youTrackUrl) {
    $.ajax({
        url: youTrackUrl,
        dataType: "json",
        headers: {
            accept: 'application/json'
        },
        success: function (jsonData) {
            DisplayLatestUpdatedItems(jsonData);
        },
        error: function () {
        }
    });
}

function DisplayLatestUpdatedItems(jsonData) {
    $("#YouTrackItemList").empty();
    
    var markUp = '<table class="issue-list">';
    
    for (var key in jsonData) {
        var youTrackId = "";
        var youTrackTitle = "";
        var youTrackUser = "";
        var youTrackType = "";
        var youTrackState = "";
        var updated = "";
        var boardType = "";

        var youTrackItem = jsonData[key];
        for (var youTrackItemField in youTrackItem) {
            if (youTrackItemField == "id")
                youTrackId = youTrackItem[youTrackItemField];
            else if (youTrackItemField == "field") {
                // This contains an array of objects which are in turn an array of objects ... yuk
                var customFields = youTrackItem[youTrackItemField];
                for (var customField in customFields) {
                    var field = customFields[customField];

                    if (field["name"] == "summary")
                        youTrackTitle = field["value"];
                    else if (field["name"] == "updated")
                        updated = ConvertYouTrackDate(field["value"]);
                    else if (field["name"] == "updaterFullName")
                        youTrackUser = field["value"];
                    else if (field["name"] == "Type")
                        youTrackType = field["value"].toString();
                    else if (field["name"] == "State")
                        youTrackState = field["value"].toString();
                    else {
                        console.log(field["name"].toString() + " = " + field["value"].toString());
                    }
                }
            }
        }
        
        markUp = markUp + DisplayYouTrackItem(boardType, youTrackId, youTrackTitle, youTrackUser, youTrackType, updated, youTrackState);
    }

    markUp = markUp + '</table>';
    $("#YouTrackItemList").append(markUp);
}

function CountYouTrackItemsOnBoard(boardName, youTrackUrl, states) {
    $.ajax({
        url: youTrackUrl,
        dataType: "json",
        headers: {
            accept: 'application/json'
        },
        success: function(jsonData) {
            CountIssues(boardName, jsonData, states);
        },
        error: function() {
        }
    });
}

function CountIssues(boardName, jsonData, states) {
    var counts = [];
    for (var stateName in states)
        counts[stateName] = 0;
    counts["PayrollBoardTotal"] = 0;
    
    for (var key in jsonData) {
        var youTrackType = "";
        var youTrackState = "";

        var youTrackItem = jsonData[key];
        for (var youTrackItemField in youTrackItem) {
            if (youTrackItemField == "field") {
                // This contains an array of objects which are in turn an array of objects ... yuk
                var customFields = youTrackItem[youTrackItemField];
                for (var customField in customFields) {
                    var field = customFields[customField];

                    if (field["name"] == "Type")
                        youTrackType = field["value"].toString();
                    else if (field["name"] == "State") 
                        youTrackState = field["value"].toString();
                }
            }
        }
        if ((youTrackType != "Feature") && (youTrackType != "Task")) {
            counts["PayrollBoardTotal"]++;
            counts[youTrackState]++;
        }
    }
    DisplayCounts(boardName, counts, states);
}

function DisplayCounts(boardName, counts, states) {
    var clearDivId = "Clear-" + CleanseCountName(boardName);
    var countsDivId = "Count-" + CleanseCountName(boardName);

    $("#" + clearDivId).remove();
    $("#" + countsDivId).remove();

    $("body").append('<div class="clear" id="' + clearDivId + '"></div>');
    $("body").append('<div class="payroll-board" id="' + countsDivId + '"></div>');

    var boardCounts = $("#" + countsDivId);
    
    boardCounts.append('<div class="payroll-board-type"><span class="large-text">' + boardName + '</span></div>');
    
    for (var stateName in states)
        boardCounts.append('<div class="payroll-board-state"><span>' + states[stateName] + '</span><br/><span class="large-text">' + counts[stateName] + '</span></div>');
    
    boardCounts.append('<div class="payroll-board-state"><span>Total</span><br/><span class="large-text">' + counts["PayrollBoardTotal"] + '</span></div>');
}

function DisplayYouTrackItem(boardType, youTrackId, youTrackTitle, youTrackUser, youTrackType, updated, youTrackState) {
    var formattedId = youTrackId.replace("-", "&#8209;");

    var markUp = '<tr class="youtrack-first-row"><td rowspan="3" class="youtrack-id">' + formattedId + '</td><td class="youtrack-body">' + youTrackType + ' : ' + youTrackTitle + '</td></tr>'
               + '<tr class="youtrack-middle-row"><td class="youtrack-body">State : ' + youTrackState + '</td></tr>'
               + '<tr class="youtrack-last-row"><td class="youtrack-body">Updated : ' + youTrackUser + ' at ' + updated + '</td></tr>';
    
    return markUp;
}

function ConvertYouTrackDate(milliseconds) {
    var thisDate = new Date(0);
    thisDate.setMilliseconds(milliseconds);
    
    // using getUTCHours gives us an hour earlier rather than later. I believe this is data related. So having to manually add an hour for the moment
    thisDate.setTime(thisDate.getTime() + (60 * 60 * 1000));
    
    var displayString = "";

    if (thisDate.getDate() < 10)
        displayString = "0" + thisDate.getDate() + "/";
    else
        displayString = thisDate.getDate() + "/";
    
    if ((thisDate.getMonth() + 1) < 10)
        displayString = displayString + "0" + (thisDate.getMonth() + 1) + "/" + thisDate.getFullYear() + " at ";
    else
        displayString = displayString + (thisDate.getMonth() + 1) + "/" + thisDate.getFullYear() + " at ";

    if (thisDate.getHours() < 10)
        displayString = displayString + "0" + thisDate.getHours() + ":";
    else
        displayString = displayString + thisDate.getHours() + ":";
    
    if (thisDate.getMinutes() < 10)
        displayString = displayString + "0" + thisDate.getMinutes();
    else
        displayString = displayString + thisDate.getMinutes();

    return displayString;
}

function CleanseCountName(name) {
    return name.replace(" ", "").replace(".", "").replace("'", "");
}