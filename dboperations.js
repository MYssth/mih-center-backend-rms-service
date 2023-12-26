require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
var config = require("./dbconfig");
const sql = require("mssql");
const dateFns = require("date-fns");

async function getAllPSN() {
  console.log("let getAllPSN");
  const result = await fetch(
    `http://${process.env.backendHost}:${process.env.himsPort}/api/himspsn/getallpsn`
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("getAllPSN complete");
      return data;
    })
    .catch((error) => {
      if (error.name === "AbortError") {
        console.log("cancelled");
      } else {
        console.error("Error:", error);
      }
    });
  return result;
}

async function addPSNName(result) {
  console.log("get personnel data from hims");
  const psnList = await getAllPSN();

  console.log("push personnel name into data");
  for (let i = 0; i < psnList.length; i += 1) {
    for (let n = 0; n < result.length; n += 1) {
      if (psnList[i].psn_id === result[n].create_by) {
        await Object.assign(result[n], {
          create_name:
            psnList[i].pname + "" + psnList[i].fname + " " + psnList[i].lname,
        });
      }
      if (psnList[i].psn_id === result[n].last_edit_by) {
        await Object.assign(result[n], {
          last_edit_name:
            psnList[i].pname + "" + psnList[i].fname + " " + psnList[i].lname,
        });
      }
      if (psnList[i].psn_id === result[n].audit_by) {
        await Object.assign(result[n], {
          audit_name:
            psnList[i].pname + "" + psnList[i].fname + " " + psnList[i].lname,
        });
      }
    }
  }
  return result;
}

async function getAllDept() {
  console.log("let getAllDept");
  const result = await fetch(
    `http://${process.env.backendHost}:${process.env.himsPort}/api/himspsn/getalldept`
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("getAllDept complete");
      return data;
    })
    .catch((error) => {
      if (error.name === "AbortError") {
        console.log("cancelled");
      } else {
        console.error("Error:", error);
      }
    });
  return result;
}

async function addDeptName(result) {
  console.log("get department data from hims");
  const deptList = await getAllDept();

  console.log("push department name into data");
  for (let i = 0; i < deptList.length; i += 1) {
    for (let n = 0; n < result.length; n += 1) {
      if (deptList[i].dept_id === result[n].occur_dept_id) {
        await Object.assign(result[n], {
          occur_dept_name: deptList[i].dept_name,
          occur_fac_name: deptList[i].fac_name,
        });
      }
      if (deptList[i].dept_id === result[n].rel_dept_dept_id) {
        await Object.assign(result[n], {
          rel_dept_dept_name: deptList[i].dept_name,
          rel_dept_fac_name: deptList[i].fac_name,
        });
      }
    }
  }
  return result;
}

async function addHIMSData(result) {
  console.log("Add data from HIMS");
  result = await addPSNName(result);
  result = await addDeptName(result);
  return result;
}

async function newRelDeptInit(rel_dept_init, taskId) {
  let pool = await sql.connect(config);
  if (Array.isArray(rel_dept_init)) {
    for (let i = 0; i < rel_dept_init.length; i += 1) {
      await pool
        .request()
        .input("task_id", sql.VarChar, taskId)
        .input("dept_id", sql.VarChar, rel_dept_init[i])
        .query(
          "INSERT INTO rms_rel_dept_init" +
            " (task_id" +
            ", dept_id)" +
            " VALUES" +
            " (@task_id" +
            ", @dept_id)"
        );
    }
  } else {
    await pool
      .request()
      .input("task_id", sql.VarChar, taskId)
      .input("dept_id", sql.VarChar, rel_dept_init)
      .query(
        "INSERT INTO rms_rel_dept_init" +
          " (task_id" +
          ", dept_id)" +
          " VALUES" +
          " (@task_id" +
          ", @dept_id)"
      );
  }
}

async function newRelDept(rel_dept, taskId) {
  let pool = await sql.connect(config);
  if (Array.isArray(rel_dept)) {
    for (let i = 0; i < rel_dept.length; i += 1) {
      await pool
        .request()
        .input("task_id", sql.VarChar, taskId)
        .input("dept_id", sql.VarChar, rel_dept[i])
        .query(
          "INSERT INTO rms_rel_dept" +
            " (task_id" +
            ", dept_id" +
            ", times" +
            ", reviewed)" +
            " VALUES" +
            " (@task_id" +
            ", @dept_id " +
            ", 0" +
            ", 0)"
        );
    }
  } else {
    await pool
      .request()
      .input("task_id", sql.VarChar, taskId)
      .input("dept_id", sql.VarChar, rel_dept)
      .query(
        "INSERT INTO rms_rel_dept" +
          " (task_id" +
          ", dept_id" +
          ", times" +
          ", reviewed)" +
          " VALUES" +
          " (@task_id" +
          ", @dept_id " +
          ", 0" +
          ", 0)"
      );
  }
}

async function newRelTools(rel_tools, rel_tools_other, taskId) {
  let pool = await sql.connect(config);
  if (Array.isArray(rel_tools)) {
    for (let i = 0; i < rel_tools.length; i += 1) {
      await pool
        .request()
        .input("task_id", sql.VarChar, taskId)
        .input("tool_id", sql.VarChar, rel_tools[i])
        .input(
          "other",
          sql.VarChar,
          rel_tools[i] === "2" ? rel_tools_other : ""
        )
        .query(
          "INSERT INTO rms_rel_tools" +
            " (task_id" +
            ", tool_id" +
            ", other)" +
            " VALUES" +
            " (@task_id" +
            ", @tool_id" +
            ", @other)"
        );
    }
  } else {
    await pool
      .request()
      .input("task_id", sql.VarChar, taskId)
      .input("tool_id", sql.VarChar, rel_tools)
      .input("other", sql.VarChar, rel_tools === "2" ? rel_tools_other : "")
      .query(
        "INSERT INTO rms_rel_tools" +
          " (task_id" +
          ", tool_id" +
          ", other)" +
          " VALUES" +
          " (@task_id" +
          ", @tool_id" +
          ", @other)"
      );
  }
}

async function getRelDept(taskId) {
  let pool = await sql.connect(config);
  let result = await pool
    .request()
    .input("task_id", sql.VarChar, taskId)
    .query(
      "SELECT" +
        " id AS rel_dept_id" +
        ", dept_id AS rel_dept_dept_id" +
        ", times AS rel_dept_times" +
        ", reviewed AS rel_dept_reviewed" +
        " FROM rms_rel_dept" +
        " WHERE task_id = @task_id"
    );
  result = await addDeptName(result.recordsets[0]);
  return result;
}

async function getRelTools(taskId) {
  let pool = await sql.connect(config);
  let result = await pool
    .request()
    .input("task_id", sql.VarChar, taskId)
    .query(
      "SELECT" +
        " rel_tools.tool_id AS rel_tool_id" +
        ", rel_tools.other AS rel_tool_other" +
        ", tools.name AS rel_tool_name" +
        " FROM rms_rel_tools rel_tools" +
        "LEFT JOIN rms_tools tools ON tools.id = rel_tools.tool_id"
    );
  return result.recordsets[0];
}

async function newTask(task, taskId, attm) {
  try {
    console.log("newTask call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    await pool
      .request()
      .input("id", sql.VarChar, taskId)
      .input("type_id", sql.TinyInt, task.type_id)
      .input("subtype_id", sql.TinyInt, task.subtype_id)
      .input("occur_date", sql.SmallDateTime, task.occur_date)
      .input("occur_dept_id", sql.VarChar, task.occur_dept_id)
      .input("area", sql.VarChar, task.area)
      .input("HN", sql.VarChar, task.HN)
      .input("AN", sql.VarChar, task.AN)
      .input("rel_ppl", sql.VarChar, task.rel_ppl)
      .input("detail", sql.Text, task.detail)
      .input("basic_soln", sql.Text, task.basic_soln)
      .input("basic_sugn", sql.Text, task.basic_sugn)
      .input("attm", sql.TinyInt, attm)
      .input("create_by", sql.VarChar, task.create_by)
      .query(
        "INSERT INTO rms_tasks" +
          " (id" +
          ", type_id" +
          ", subtype_id" +
          ", occur_date" +
          ", occur_dept_id" +
          ", area" +
          ", HN" +
          ", AN" +
          ", rel_ppl" +
          ", detail" +
          ", basic_soln" +
          ", basic_sugn" +
          ", attm" +
          ", status_id" +
          ", lv_id" +
          ", create_by" +
          ", create_date" +
          ", last_edit_by" +
          ", last_edit_date" +
          ", audit_by" +
          ", audit_sugn" +
          ", audit_date)" +
          " VALUES" +
          " (@id" +
          ", @type_id" +
          ", @subtype_id" +
          ", @occur_date" +
          ", @occur_dept_id" +
          ", @area" +
          ", @HN" +
          ", @AN" +
          ", @rel_ppl" +
          ", @detail" +
          ", @basic_soln" +
          ", @basic_sugn" +
          ", @attm" +
          ", 1" +
          ", 0" +
          ", @create_by" +
          ", GETDATE()" +
          ", ''" +
          ", ''" +
          ", ''" +
          ", ''" +
          ", '')"
      );

    if (task.rel_dept_init !== undefined) {
      await newRelDeptInit(task.rel_dept_init, taskId);
    }
    console.log("newTask complete");
    console.log("====================");
    return { status: "ok", message: "บันทึกความเสี่ยงเรียบร้อยแล้ว" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

const taskQryText =
  "SELECT tasks.*" +
  ", type.name AS type_name" +
  ", subtype.name AS subtype_name" +
  ", status.name AS status_name" +
  ", lv.name AS lv_name" +
  " FROM rms_tasks tasks" +
  " LEFT JOIN rms_type type ON type.id = tasks.type_id" +
  " LEFT JOIN rms_subtype subtype ON subtype.id = tasks.subtype_id" +
  " LEFT JOIN rms_status status ON status.id = tasks.status_id" +
  " LEFT JOIN rms_lv lv ON lv.id = tasks.lv_id AND lv.type_id = tasks.type_id";

async function getTask() {
  try {
    console.log("getAllTask call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool.request().query(taskQryText);
    result = await addHIMSData(result.recordsets[0]);
    console.log("getAllTask complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getTaskById(id) {
  try {
    console.log("getTaskById " + id + " call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
      .request()
      .input("id", sql.VarChar, id)
      .query(`${taskQryText} WHERE tasks.id = @id`);
    result = await addHIMSData(result.recordsets[0]);
    console.log("getTaskById complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function updateTask(task) {
  try {
    console.log("updateTask id = " + task.id + " call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    await pool
      .request()
      .input("id", sql.VarChar, task.id)
      .input("type_id", sql.TinyInt, task.type_id)
      .input("subtype_id", sql.TinyInt, task.subtype_id)
      .input("occur_date", sql.SmallDateTime, task.occur_date)
      .input("occur_dept_id", sql.VarChar, task.occur_dept_id)
      .input("area", sql.VarChar, task.area)
      .input("HN", sql.VarChar, task.HN)
      .input("AN", sql.VarChar, task.AN)
      .input("rel_ppl", sql.VarChar, task.rel_ppl)
      .input("detail", sql.Text, task.detail)
      .input("basic_soln", sql.Text, task.basic_soln)
      .input("basic_sugn", sql.Text, task.basic_sugn)
      .input("last_edit_by", sql.VarChar, task.last_edit_by)
      .query(
        "UPDATE rms_tasks" +
          " SET" +
          " type_id = @type_id" +
          ", subtype_id = @subtype_id" +
          ", occur_date = @occur_date" +
          ", occur_dept_id = @occur_dept_id" +
          ", area = @area" +
          ", HN = @HN" +
          ", AN = @AN" +
          ", rel_ppl = @rel_ppl" +
          ", detail = @detail" +
          ", basic_soln = @basic_soln" +
          ", basic_sugn = @basic_sugn" +
          ", last_edit_by = @last_edit_by" +
          ", last_edit_date = GETDATE()" +
          " WHERE id = @id"
      );

    console.log("updateTask complete");
    console.log("====================");
    return { status: "ok", message: "แก้ไขความเสี่ยงเรียบร้อย" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function considerTask(task) {
  try {
    console.log(
      "considerTask id = " + task.id + " call, try connect to server"
    );
    let pool = await sql.connect(config);
    console.log("connect complete");

    await pool
      .request()
      .input("id", sql.VarChar, task.id)
      .input("lv_id", sql.TinyInt, task.lv_id)
      .input("last_edit_by", sql.VarChar, task.last_edit_by)
      .query(
        "UPDATE rms_tasks" +
          " SET" +
          " status_id = 2" +
          ", lv_id = @lv_id" +
          ", last_edit_by = @last_edit_by" +
          ", last_edit_date = GETDATE()" +
          " WHERE id = @id"
      );

    if (task.rel_dept !== undefined) {
      await newRelDept(task.rel_dept, task.id);
    }

    if (task.rel_tools !== undefined) {
      await newRelTools(task.rel_tools, task.rel_tools_other, task.id);
    }

    console.log("considerTask complete");
    console.log("====================");
    return { status: "ok", message: "บันทึกการพิจารณาความเสี่ยงเรียบร้อย" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function newDeptReview() {
  try {
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getType() {
  try {
    console.log("getType call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool.request().query("SELECT * FROM rms_type");
    console.log("getType complete");
    console.log("====================");
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getSubType() {
  try {
    console.log("getSubType call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool.request().query("SELECT * FROM rms_subtype");
    console.log("getSubType complete");
    console.log("====================");
    return result.recordsets[0];
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
  newTask: newTask,
  getTask: getTask,
  getTaskById: getTaskById,
  updateTask: updateTask,
  considerTask: considerTask,
  newDeptReview: newDeptReview,
  getType: getType,
  getSubType: getSubType,
  getVersion: getVersion,
};
