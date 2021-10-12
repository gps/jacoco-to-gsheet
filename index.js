const core = require('@actions/core');
const { google } = require('googleapis');
const fs = require("fs");

async function run() {
  const path = core.getInput("JACOCO_CSV_PATH");
  const spreadsheetId = core.getInput("SPREADSHEET_ID");
  const sheetName = core.getInput("SPREADSHEET_NAME");
  const apiClientEmail = core.getInput("API_CLIENT_EMAIL");
  const privateKey = core.getInput("API_PRIVATE_KEY");
  const jacocoReportFileContent = fs.readFileSync(path).toString().split('\n').map(e => e.trim());
  const codeCoverageDataArray = jacocoReportFileContent.map(e => e.split(',').map(e => e.trim()));
  let refactoredCodeCoverageData = getRefactoredCSVCodeCoverageData(codeCoverageDataArray);
  const auth = new google.auth.JWT(
    apiClientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const googleSheetsInstance = google.sheets({ version: "v4", auth: auth });
  const readData = await googleSheetsInstance.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: sheetName,
  });
  const googleSheetData = generateGoogleSheetData(readData, refactoredCodeCoverageData);
  updateGoogleSpreadSheet(auth, spreadsheetId, sheetName, googleSheetData, googleSheetsInstance);
}

function generateGoogleSheetData(readData, refactoredCodeCoverageData) {
  let googleSheetData;
  if (typeof readData.data.values == 'undefined') {
    googleSheetData = refactoredCodeCoverageData;
  } else {
    googleSheetData = readData.data.values;
    let lastUpdatedDate = googleSheetData[0][googleSheetData[0].length - 1];
    for (const i in refactoredCodeCoverageData) {
      let isCurrentDataUpdated = false;
      for (const j in googleSheetData) {
        if (refactoredCodeCoverageData[0][1] == lastUpdatedDate && refactoredCodeCoverageData[i][0] == googleSheetData[j][0]) {
          googleSheetData[j][googleSheetData[0].length - 1] = refactoredCodeCoverageData[i][1];
          isCurrentDataUpdated = true;
          break;
        }
        if (refactoredCodeCoverageData[i][0] == googleSheetData[j][0]) {
          googleSheetData[j].push(refactoredCodeCoverageData[i][1]);
          isCurrentDataUpdated = true;
          break;
        }
      }
      if (isCurrentDataUpdated == false) {
        googleSheetData.push([refactoredCodeCoverageData[i][0]]);
        const length = googleSheetData.length - 1;
        for (let i = 0; i < googleSheetData[0].length - 2; i++) {
          googleSheetData[length].push(0);
        }
        googleSheetData[length].push(refactoredCodeCoverageData[i][1]);
      }
    }
  }
  googleSheetData.sort(function (a, b) {
    if (a[0] == b[0]) return 0;
    if (a[0] == "Package") return -1;
    if (b[0] == "Package") return 1;
    return a[0].toLowerCase() > b[0].toLowerCase() ? 1 : -1;
  });
  return googleSheetData;
}

async function updateGoogleSpreadSheet(auth, spreadsheetId, sheetName, googleSheetData, googleSheetsInstance) {
  await googleSheetsInstance.spreadsheets.values.clear({
    auth,
    spreadsheetId,
    range: sheetName
  });
  await googleSheetsInstance.spreadsheets.values.append({
    auth,
    spreadsheetId,
    range: sheetName,
    resource: {
      values: googleSheetData
    },
    valueInputOption: "USER_ENTERED"
  });
  console.log("SpreadSheet link : https://docs.google.com/spreadsheets/d/" + spreadsheetId);
}

function getRefactoredCSVCodeCoverageData(codeCoverageData) {
  let isPreviousRecordSame = false;
  let packageName;
  let instructionsMissed = 0;
  let instructionsCovered = 0;
  const todayDate = new Date().toISOString().slice(0, 10);
  let refactoredCodeCoverageData = [["Package", "Instructions covered in percentage on " + todayDate]];
  for (const i in codeCoverageData) {
    if (i > 0) {
      if (isPreviousRecordSame == false) {
        packageName = codeCoverageData[i][1];
        instructionsMissed = parseInt(instructionsMissed) + parseInt(codeCoverageData[i][3]);
        instructionsCovered = parseInt(instructionsCovered) + parseInt(codeCoverageData[i][4]);
        isPreviousRecordSame = true;
      } else {
        if (codeCoverageData[i][1] == packageName) {
          instructionsMissed = parseInt(instructionsMissed) + parseInt(codeCoverageData[i][3]);
          instructionsCovered = parseInt(instructionsCovered) + parseInt(codeCoverageData[i][4]);
        } else {
          refactoredCodeCoverageData.push([packageName, parseInt((instructionsCovered / (instructionsMissed + instructionsCovered)) * 100)]);
          instructionsMissed = 0;
          instructionsCovered = 0;
          instructionsMissed = parseInt(instructionsMissed) + parseInt(codeCoverageData[i][3]);
          instructionsCovered = parseInt(instructionsCovered) + parseInt(codeCoverageData[i][4]);
          isPreviousRecordSame = false;
        }
      }
    }
  }
  return refactoredCodeCoverageData;
}

run();

