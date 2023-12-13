require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
var config = require("./dbconfig");
const sql = require("mssql");

async function getPRHeader(usr_req) {
  try {
    console.log("getPRHeader call try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    console.log("Get user request list");
    const usrReqQry = await fetch(
      `http://${process.env.backendHost}:${process.env.himsPort}/api/himspsn/getusrreqlist/${usr_req}`
    )
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          console.log("cancelled");
        } else {
          console.error("Error:", error);
        }
      });
    // let result = [{ name: usrReqQry.name }];
    let result = [];
    if (usrReqQry.status !== "error") {
      for (let i = 0; i < usrReqQry.usrReqList.length; i += 1) {
        let tmp = await pool
          .request()
          .query(
            `SELECT * FROM VIEW_PR_HEADER WHERE REFFLG = '2' AND AUTCOD = '${usrReqQry.usrReqList[i]}'`
          );
        // .query("SELECT * FROM VIEW_PR_HEADER");
        tmp = await tmp.recordsets[0];
        for (let j = 0; j < tmp.length; j += 1) {
          await result.push(tmp[j]);
        }
      }
      await result.sort((a, b) => {
        const RQONOA = a.RQONO;
        const RQONOB = b.RQONO;
        if (RQONOA < RQONOB) {
          return -1;
        }
        if (RQONOA > RQONOB) {
          return 1;
        }
        return 0;
      });
    }
    console.log("getPRHeader complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getVersion() {
  try {
    return process.env.version;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

module.exports = {
  getPRHeader: getPRHeader,
  getVersion: getVersion,
};
