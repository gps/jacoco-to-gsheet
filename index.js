const core = require('@actions/core');
const { google } = require('googleapis');
const fs = require("fs");

async function run() {
  const path = core.getInput("JACOCO_CSV_PATH");
  // const path = "bbb.csv";
  const spreadsheetId = core.getInput("SPREADSHEET_ID");
  // const spreadsheetId = "1l2QViepZyw1W3lPXV4rtxBaUx3nhsKdCtMsIjijfIJU";
  const sheetName = core.getInput("SPREADSHEET_NAME");
  // const sheetName = "Sheet2";
  const sheetName = core.getInput("API_CLIENT_EMAIL");
  // const apiClientEmail = "jacoco-code-coverage@android-bcn.iam.gserviceaccount.com";
  
  const sheetName = core.getInput("API_PRIVATE_KEY");
  const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDEyqW4zX3OJz60\nR6ZiSMs/nK3DBhGaqyLQLx591nkSiZrMWFZjQK8hlO53kS4kHhl5qp0DbNs0AOep\nhkDAOAH3U1xYf39RaRl5RnTkziC8+yxqjsDB1hH0fPfNtXH5wW/skZPFh1RFpaPR\nR2p/m9te+PJQRmXVWTv27AvcQrQ/b+MJu9kclNrihvabchUcWYdmDcn7ujQVJxAG\no6pGwEq7iq873msRHzEb/mlTR//V5tE/EXrA/w6tF2mNd61BFUKXqfTKDmn8eIBp\ndw/qfNVdJM7LTFLzRId7yL5r/8v9xXXHmaCijEwF6AhNTwyN2QG/RmteZ95nqSNO\n7dxgMvh7AgMBAAECggEAHZGSB1ZU/f9L6XxPOzr90w/gf0paUHeWB7A0xX/5eXgU\nkCSrzPEAqivoYth9FYSHm7jaK76/oazgd3U1JcykkFFwXC8YEGxEHW1L42niEGiF\nxXhal9AUVZHbYrIjLyhKABflm2CYoHhhc3C8HJ1sqkn/Orbr1nvjHy2wyzEjR9lC\neffhKEG5DJcU9ghmUGjh1bCzbQ2PzC1rKg+HtWnysQ6fmGq80nlwGY087kBr1kxL\nGtUoVD60xkV0mmPJJfZHUSfbHSsg08z3rdtq8R+afan1ta+eReQhyzeKTMh704d6\n/qKEh8zNIsXzv8wWKVhKDVZFnevq2oi5xcO8UyiPJQKBgQDxNLVwS3mubHLDlDrB\nZGtZC9bxt72QkCAhwvTVX6O4Iy1a1iGcWNyc3XreJn4eYCgrxt5Abu90stG9PF6I\nq7YbW2cRICmzf+hsSNl54NHavx6wp+ozdCriSkF7orXAZiYc47vBve3g23x2phT8\n89djQx5aJtZLvxCzChGqO0kqBwKBgQDQ3JFo1/bBp/XEo/vOSJMMvGjX4cuYJxAS\nqUMuxujr//XGJukhjOccIeqqtcFJSZ19QuqFp5h2wZQ6MC8k8gGjUWjyXDPo0tX/\nu5Qq0t99l/EaKCZMx3zk2PbQod2XG0lefm3bXdGCZY63fXzvkOVCOLYFw7lCYmni\n/tTwt0xw7QKBgGiKI6kLzS0fq43AjMaMs0ngq8QPkoU5MfPv/xULYnXIKTwZWm/c\nw6DpDPuDS1325vIyOtlKO1Ykump946rwYPjyYHU3r1swsJdd64O7QLjB5JdD72ll\ni8CP1lmzZ3p/yzzyJsoNey/dcNAroyUOuec3i8we0Pn7UU2Hq6hQEaG5AoGAXGYH\nyisolfm5J3ooTtUagNrlQwQ4LqKxYKATAaGrr6Q31aanIlmUcISsrULlNIflrWGq\nIODI+VigO7HPWXfas6azV+zkZg7H72/Ll7pcdtJ+LkUu1G64WQGHBztkrZG7vpsN\n/KsfoaFOJuzUFaOzWL2AAULaNX0WPP7hs3BT1+0CgYB9lVlPM84mv6E1nKmo9cSl\nIUqYLBZT5dtreqfVsZHTdlgc7vTq9u4hdG6OuxpM+lesNorWKH/2uWC8OeHkUJqP\naZD45s5Zl5vL4qcKJVz+ypYpJLz5OO5+jCYRVBaSB5ZRZK/DqDCgAnBqe3O5XERD\ngBGyv8YsHHoLLolhs9dALQ==\n-----END PRIVATE KEY-----\n";
  const codeCoverageData = fs.readFileSync(path).toString().split('\n').map(e => e.trim()).map(e => e.split(',').map(e => e.trim()));
  var refactoredCodeCoverageData = getRefactorCSVCodeCoverageData(codeCoverageData);
  const auth = new google.auth.JWT(
    apiClientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  )
  const googleSheetsInstance = google.sheets({ version: "v4", auth: auth });
  try {
    const readData = await googleSheetsInstance.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: sheetName,
    })
    const googleSheetData = generateGoogleSheetData(readData, refactoredCodeCoverageData)
    updateGoogleSpreadSheet(auth, spreadsheetId, sheetName, googleSheetData, googleSheetsInstance)
  } catch (e) {
    console.error(e)
  }
}

function generateGoogleSheetData(readData, refactoredCodeCoverageData) {
  var googleSheetData
  if (typeof readData.data.values == 'undefined') {
    googleSheetData = refactoredCodeCoverageData
  } else {
    var googleSheetData = readData.data.values;
    for (const i in refactoredCodeCoverageData) {
      var isCurrentDataUpdated = false;
      for (const j in googleSheetData) {
        if (refactoredCodeCoverageData[i][0] == googleSheetData[j][0]) {
          googleSheetData[j].push(refactoredCodeCoverageData[i][1]);
          isCurrentDataUpdated = true
          break;
        }
      }
      if (isCurrentDataUpdated == false) {
        googleSheetData.push([refactoredCodeCoverageData[i][0]])
        const length = googleSheetData.length - 1
        for (let i = 0; i < googleSheetData[0].length - 2; i++) {
          googleSheetData[length].push(0);
        }
        googleSheetData[length].push(refactoredCodeCoverageData[i][1]);
      }
    }
  }
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
  core.setOutput("SPREADSHEETSHEET_LINK", "https://docs.google.com/spreadsheets/d/" + spreadsheetId)
}

function getRefactorCSVCodeCoverageData(codeCoverageData) {
  var isPreviousRecordSame = false;
  var packageName;
  var instructionsMissed = 0;
  var instructionsCovered = 0;
  const todayDate = new Date().toISOString().slice(0, 10);
  var refactoredCodeCoverageData = [["Package", "Instructions covered in percentage on " + todayDate]];
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
          refactoredCodeCoverageData.push([packageName, parseInt((instructionsCovered / (instructionsMissed + instructionsCovered)) * 100)])
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

