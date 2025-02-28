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
      if (deptList[i].dept_id === result[n].dept_id) {
        await Object.assign(result[n], {
          dept_name: deptList[i].dept_name,
          fac_id: deptList[i].fac_id,
          fac_name: deptList[i].fac_name,
          fld_id: deptList[i].fld_id,
          fld_name: deptList[i].fld_name,
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

async function addRelDept(taskList){

  for (let i = 0; i < taskList.length; i += 1) {
    console.log("get relate department data");
    console.log("task id = "+taskList[i].id);
    const relDeptList = await getRelDeptInit(taskList[i].id);
    console.log("relDeptList = "+JSON.stringify(relDeptList));
    await Object.assign(taskList[i], {
      relDeptList : relDeptList,
    });
  }

  return taskList;
}

async function addRelRef(taskList){

  for (let i = 0; i < taskList.length; i += 1) {
    console.log("get relate referee data");
    console.log("task id = "+taskList[i].id);
    const relRefList = await getRelRef(taskList[i].id);
    console.log("relRefList = "+JSON.stringify(relRefList));
    await Object.assign(taskList[i], {
      relRefList : relRefList,
    });
  }

  return taskList;
}

async function addRelTool(taskList){

  for (let i = 0; i < taskList.length; i += 1) {
    console.log("get relate tool data");
    console.log("task id = "+taskList[i].id);
    const relToolList = await getRelTools(taskList[i].id);
    console.log("relToolList = "+JSON.stringify(relToolList));
    await Object.assign(taskList[i], {
      relToolList : relToolList,
    });
  }

  return taskList;
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

async function getRelDeptInit(taskId) {
  let pool = await sql.connect(config);
  let result = await pool
    .request()
    .input("task_id", sql.VarChar, taskId)
    .query(
      "SELECT" +
        " dept_id" +
        " FROM rms_rel_dept_init" +
        " WHERE task_id = @task_id"
    );
  result = await addDeptName(result.recordsets[0]);
  return result;
}

async function getRelRef(taskId) {
  let pool = await sql.connect(config);
  let result = await pool
    .request()
    .input("task_id", sql.VarChar, taskId)
    .query(
      "SELECT" +
        " rms_rel_ref.ref_id, rms_ref.name" +
        " FROM rms_rel_ref" +
        " LEFT JOIN rms_ref ON rms_ref.id = rms_rel_ref.ref_id" +
        " WHERE task_id = @task_id"
    );
  return result.recordsets[0];
}

async function getRelTools(taskId) {
  let pool = await sql.connect(config);
  let result = await pool
    .request()
    .input("task_id", sql.VarChar, taskId)
    .query(
      "SELECT" +
        " rel_tools.tool_id" +
        ", rel_tools.other" +
        ", tools.name" +
        " FROM rms_rel_tools rel_tools" +
        " LEFT JOIN rms_tools tools ON tools.id = rel_tools.tool_id" +
        " WHERE rel_tools.task_id = @task_id"
    );
  return result.recordsets[0];
}

async function newTask(task, taskId, base64Files) {
  try {
    console.log("newTask call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    await pool
      .request()
      .input("id", sql.VarChar, taskId)
      .input("type_id", sql.TinyInt, task.type_id)
      .input("subtype_id", sql.TinyInt, task.subtype_id)
      .input("type_subject_id", sql.TinyInt, task.type_subject_id)
      .input("occur_date", sql.SmallDateTime, task.occur_date)
      .input("occur_dept_id", sql.VarChar, task.occur_dept_id)
      .input("area", sql.VarChar, task.area)
      .input("HN", sql.VarChar, task.HN)
      .input("AN", sql.VarChar, task.AN)
      .input("rel_ppl", sql.VarChar, task.rel_ppl)
      .input("detail", sql.Text, task.detail)
      .input("basic_soln", sql.Text, task.basic_soln)
      .input("basic_sugn", sql.Text, task.basic_sugn)
      .input("create_by", sql.VarChar, task.create_by)
      .query(
        "INSERT INTO rms_tasks" +
          " (id" +
          ", type_id" +
          ", subtype_id" +
          ", type_subject_id" +
          ", occur_date" +
          ", occur_dept_id" +
          ", area" +
          ", HN" +
          ", AN" +
          ", rel_ppl" +
          ", detail" +
          ", basic_soln" +
          ", basic_sugn" +
          ", status_id" +
          ", create_by" +
          ", create_date" +
          ", last_edit_by" +
          ", last_edit_date)" +
          " VALUES" +
          " (@id" +
          ", @type_id" +
          ", @subtype_id" +
          ", @type_subject_id" +
          ", @occur_date" +
          ", @occur_dept_id" +
          ", @area" +
          ", @HN" +
          ", @AN" +
          ", @rel_ppl" +
          ", @detail" +
          ", @basic_soln" +
          ", @basic_sugn" +
          ", 1" +
          ", @create_by" +
          ", GETDATE()" +
          ", @create_by" +
          ", GETDATE())"
      );

    if (task.rel_dept_id !== undefined) {
      console.log("insert relate department");
      const relDepts = task.rel_dept_id.split(',');
      for (let i = 0; i < relDepts.length; i += 1) {
        await pool
          .request()
          .input("task_id", sql.VarChar, taskId)
          .input("dept_id", sql.VarChar, relDepts[i])
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

    if (base64Files.length>0) {
      console.log("insert image file");
      for (let i = 0; i < base64Files.length; i += 1) {
        await pool
          .request()
          .input("task_id", sql.VarChar, taskId)
          .input("data", sql.VarChar, base64Files[i])
          .input("create_by", sql.VarChar, task.create_by)
          .query(
            "INSERT INTO rms_file" +
              " (task_id" +
              ", data" +
              ", create_by" +
              ", create_date)" +
              " VALUES" +
              " (@task_id" +
              ", @data" +
              ", @create_by" +
              ", GETDATE())"
          );
      }
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
  ", typeSubject.name AS type_subject_name" +
  " FROM rms_tasks tasks" +
  " LEFT JOIN rms_type type ON type.id = tasks.type_id" +
  " LEFT JOIN rms_subtype subtype ON subtype.id = tasks.subtype_id" +
  " LEFT JOIN rms_status status ON status.id = tasks.status_id" +
  " LEFT JOIN rms_lv lv ON lv.id = tasks.lv_id AND lv.type_id = tasks.type_id" +
  " LEFT JOIN rms_type_subject typeSubject ON typeSubject.id = tasks.type_subject_id AND typeSubject.type_id = tasks.type_id";

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

async function getTaskByStatus(statusId) {
  try {
    console.log("getTaskByStatus " + statusId + " call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
      .request()
      .input("status_id", sql.VarChar, statusId)
      .query(`${taskQryText} WHERE tasks.status_id = @status_id`);
      result = await addHIMSData(result.recordsets[0]);
      result = await addRelDept(result);
      result = await addRelRef(result);
      result = await addRelTool(result);
    console.log("getTaskByStatus complete");
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

async function getReviewTask(psnId) {
  try {
    console.log("getReviewTask for " + psnId + " call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");

    let himsPsnDept = await fetch(
      `http://${process.env.backendHost}:${process.env.himsPort}/api/himspsn/getpsndatabyid/${psnId}`
    )
      .then((response) => response.json())
      .then((data) => {
        return data.dept_id;
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          console.log("cancelled");
        } else {
          console.error("Error:", error);
        }
      });

    let result = await pool
      .request()
      .input("dept_id", sql.VarChar, himsPsnDept)
      .query(`${taskQryText} LEFT JOIN rms_rel_dept ON rms_rel_dept.task_id = tasks.id AND rms_rel_dept.dept_id = @dept_id
         WHERE (tasks.status_id = '2' OR tasks.status_id = '3') AND rms_rel_dept.times = rms_rel_dept.reviewed `);
      result = await addHIMSData(result.recordsets[0]);
      result = await addRelDept(result);
      result = await addRelRef(result);
      result = await addRelTool(result);
    console.log("getReviewTask complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getConsiderTask() {
  try {
    console.log("getConsiderTask call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");

    let result = await pool
      .request()
      .query(`${taskQryText} LEFT JOIN rms_rel_dept ON rms_rel_dept.task_id = tasks.id
         WHERE tasks.status_id = '2' AND rms_rel_dept.times = rms_rel_dept.reviewed `);
      result = await addHIMSData(result.recordsets[0]);
      result = await addRelDept(result);
      result = await addRelRef(result);
      result = await addRelTool(result);
    console.log("getConsiderTask complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

const deptReviewQryText =
  "SELECT rdr.*" +
  ", rrc.name AS cos_name" +
  ", rrd.dept_id" +
  " FROM rms_dept_review rdr" +
  " LEFT JOIN rms_review_cos rrc ON rrc.id = rdr.cos_id" +
  " LEFT JOIN rms_rel_dept rrd ON rrd.id = rdr.rel_dept_id";

async function getDeptReviewById(id) {
  try {
    console.log("getDeptReviewById " + id + " call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
      .request()
      .input("id", sql.VarChar, id)
      .query(`${deptReviewQryText} WHERE rrd.task_id = @id ORDER BY rdr.rel_dept_id, rdr.time`);
    result = await addHIMSData(result.recordsets[0]);
    console.log("getDeptReviewById complete");
    console.log("====================");
    return result;
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getReviewCos() {
  try {
    console.log("getReviewCos call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
      .request()
      .query(`SELECT * FROM rms_review_cos ORDER BY id`);
    console.log("getReviewCos complete");
    console.log("====================");
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getReReviewDeptByTaskId(id) {
  try {
    console.log("getReReviewDeptByTaskId " + id + " call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
      .request()
      .input("taskId", sql.VarChar, id)
      .query(`SELECT dept_id FROM rms_rel_dept WHERE task_id = @taskId AND reviewed <> -1`);
    result = await addHIMSData(result.recordsets[0]);
    console.log("getReReviewDeptByTaskId complete");
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
    console.log(task);
    let pool = await sql.connect(config);
    console.log("connect complete");
    await pool
      .request()
      .input("id", sql.VarChar, task.id)
      .input("type_id", sql.TinyInt, task.type_id)
      .input("subtype_id", sql.TinyInt, task.subtype_id)
      .input("type_subject_id", sql.TinyInt, task.type_subject_id)
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
      .input("status_id", sql.TinyInt, task.status_id)
      .input("lv_id", sql.TinyInt, task.lv_id)
      .input("audit_sugn", sql.Text, task.audit_sugn)
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
          ", status_id = @status_id" +
          ", lv_id = @lv_id" +
          ", last_edit_by = @last_edit_by" +
          ", last_edit_date = GETDATE()" +
          ", audit_by = @last_edit_by" +
          ", audit_sugn = @audit_sugn" +
          ", audit_date = GETDATE()" +
        " WHERE id = @id"
    );

    if (task.rel_dept_id !== undefined) {
      console.log("insert relate department");
      const relDepts = task.rel_dept_id;
      for (let i = 0; i < relDepts.length; i += 1) {
        await pool
          .request()
          .input("task_id", sql.VarChar, task.id)
          .input("dept_id", sql.VarChar, relDepts[i])
          .query(
            "INSERT INTO rms_rel_dept" +
              " (task_id" +
              ", dept_id" +
              ", times" +
              ", reviewed)" +
              " VALUES" +
              " (@task_id" +
              ", @dept_id" +
              ", 0" +
              ", 0)"
          );
      }
    }

    if (task.rel_ref_id !== undefined) {
      console.log("insert relate referee");
      const relRefs = task.rel_ref_id;
      for (let i = 0; i < relRefs.length; i += 1) {
        await pool
          .request()
          .input("task_id", sql.VarChar, task.id)
          .input("ref_id", sql.TinyInt, relRefs[i])
          .query(
            "INSERT INTO rms_rel_ref" +
              " (task_id" +
              ", ref_id)" +
              " VALUES" +
              " (@task_id" +
              ", @ref_id)"
          );
      }
    }

    if (task.tool_id !== undefined && task.tool_id !== '') {
      console.log("insert relate tool");
      await pool
        .request()
        .input("task_id", sql.VarChar, task.id)
        .input("tool_id", sql.TinyInt, task.tool_id)
        .query(
          "INSERT INTO rms_rel_tools" +
            " (task_id" +
            ", tool_id)" +
            " VALUES" +
            " (@task_id" +
            ", @tool_id)"
        );
    }

    console.log("updateTask complete");
    console.log("====================");
    return { status: "ok", message: "แก้ไขความเสี่ยงเรียบร้อย" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function addReviewTask(data) {
  try {
    console.log("addReviewTask call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");

    let himsPsnDept = await fetch(
      `http://${process.env.backendHost}:${process.env.himsPort}/api/himspsn/getpsndatabyid/${data.psnId}`
    )
      .then((response) => response.json())
      .then((data) => {
        return data.dept_id;
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          console.log("cancelled");
        } else {
          console.error("Error:", error);
        }
      });
    
    console.log("Get review ID");
    let result = await pool
      .request()
      .input("taskId", sql.VarChar, data.taskId)
      .input("deptId", sql.VarChar, himsPsnDept)
      .query("SELECT * FROM rms_rel_dept where task_id = @taskId AND dept_id = @deptId");

    let relDeptId = result.recordset[0].id;
    let time = result.recordset[0].times+1;

    console.log("Found ID: "+relDeptId+" time: "+time);

    console.log("insert review");
    await pool
      .request()
      .input("relDeptId", sql.Int, relDeptId)
      .input("time", sql.TinyInt, time)
      .input("reviewBy", sql.VarChar, data.psnId)
      .input("imp", sql.Text, data.imp)
      .input("cosId", sql.TinyInt, data.cosId)
      .input("cosDescr", sql.Text, data.cosDescr)
      .input("guid", sql.Text, data.guid)
      .input("finDate", sql.TinyInt, data.finDate)
      .query(
        "INSERT INTO rms_dept_review" +
          " (rel_dept_id" +
          ", time" +
          ", review_by" +
          ", review_date" +
          ", imp" +
          ", cos_id" +
          ", cos_descr" +
          ", guid" +
          ", fin_date)" +
          " VALUES" +
          " (@relDeptId" +
          ", @time" +
          ", @reviewBy" +
          ", GETDATE()" +
          ", @imp" +
          ", @cosId" +
          ", @cosDescr" +
          ", @guid" +
          ", @finDate)"
      );

    console.log("Update review counter");
    await pool
      .request()
      .input("id", sql.Int, relDeptId)
      .input("time", sql.TinyInt, time)
      .query("UPDATE rms_rel_dept SET times = @time where id = @id");

      console.log("Check review status");
      let result2 = await pool
      .request()
      .input("taskId", sql.VarChar, data.taskId)
      .query("SELECT * FROM rms_rel_dept where task_id = @taskId AND times = reviewed");

      if(result2.recordsets[0].length===0){
        console.log("Update status");
        await pool
          .request()
          .input("taskId", sql.VarChar, data.taskId)
          .query("UPDATE rms_tasks SET status_id = 4 where id = @taskId");
      }

    console.log("addReviewTask complete");
    console.log("====================");
    return { status: "ok", message: "บันทึกการทบทวนเรียบร้อยแล้ว" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function considerTask(data) {
  try {
    console.log(
      "considerTask id = " + data.taskId + " call, try connect to server"
    );
    let pool = await sql.connect(config);
    console.log("connect complete");

    if(!data.isReReview){
      console.log("Pre-evaluate task");
      await pool
        .request()
        .input("taskId", sql.VarChar, data.taskId)
        .query("UPDATE rms_rel_dept SET reviewed = -1 where task_id = @taskId");
      
      await pool
        .request()
        .input("taskId", sql.VarChar, data.taskId)
        .input("evalDate", sql.SmallDateTime, data.evalDate)
        .input("considerSugn", sql.Text, data.considerSugn)
        .input("psnId", sql.Text, data.psnId)
        .query("UPDATE rms_tasks SET" +
          " status_id = 5" +
          ", eval_date = @evalDate" +
          ", consider_sugn = @considerSugn" +
          ", consider_by = @psnId" +
          ", consider_date = GETDATE()" +
          ", last_edit_by = @psnId" +
          ", last_edit_date = GETDATE()" +
          " where id = @taskId");
    }
    else {
      console.log("Re review task");
      for(let i=0;i<data.reReviewList.length;i+=1){
        if(data.reReviewList[i].checked){
          await pool
            .request()
            .input("taskId", sql.VarChar, data.taskId)
            .input("deptId", sql.VarChar, data.reReviewList[i].dept_id)
            .query("UPDATE rms_rel_dept SET reviewed = times where task_id = @taskId AND dept_id = @deptId");
        }
        else {
          await pool
            .request()
            .input("taskId", sql.VarChar, data.taskId)
            .input("deptId", sql.VarChar, data.reReviewList[i].dept_id)
            .query("UPDATE rms_rel_dept SET reviewed = -1 where task_id = @taskId AND dept_id = @deptId");
        }
      }
      await pool
        .request()
        .input("taskId", sql.VarChar, data.taskId)
        .input("psnId", sql.VarChar, data.psnId)
        .query("UPDATE rms_tasks SET status_id = 3, last_edit_by = @psnId, last_edit_date = GETDATE() where id = @taskId");
    }

    console.log("considerTask complete");
    console.log("====================");
    return { status: "ok", message: "บันทึกการพิจารณาความเสี่ยงเรียบร้อย" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function evaluateTask(data) {
  try {
    console.log(
      "evaluateTask id = " + data.taskId + " call, try connect to server"
    );
    let pool = await sql.connect(config);
    console.log("connect complete");

    let statusId = 6;
    if(data.isPass){
      statusId = 7;
    }

    await pool
      .request()
      .input("taskId", sql.VarChar, data.taskId)
      .input("actEvalDate", sql.SmallDateTime, data.actEvalDate)
      .input("evalSugn", sql.Text, data.evalSugn)
      .input("psnId", sql.Text, data.psnId)
      .input("statusId", sql.TinyInt, statusId)
      .query("UPDATE rms_tasks SET" +
        " status_id = @statusId" +
        ", act_eval_date = @actEvalDate" +
        ", eval_sugn = @evalSugn" +
        ", eval_by = @psnId" +
        ", last_edit_by = @psnId" +
        ", last_edit_date = GETDATE()" +
        " where id = @taskId");

    console.log("evaluateTask complete");
    console.log("====================");
    return { status: "ok", message: "บันทึกการประเมินความเสี่ยงเรียบร้อย" };
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

async function getTypeSubject() {
  try {
    console.log("getTypeSubject call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool.request().query("SELECT * FROM rms_type_subject");
    console.log("getTypeSubject complete");
    console.log("====================");
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getTypeSubjectByTypeId(typeId) {
  try {
    console.log("getTypeSubjectByTypeId "+typeId+" call, try connect to server");
    if(typeId !== '1' && typeId !== '2'){
      typeId = 0;
    }
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
          .request()
          .input("typeId", sql.TinyInt, typeId)
          .query("SELECT * FROM rms_type_subject where type_id = @typeId");
    console.log("getTypeSubjectByTypeId complete");
    console.log("====================");
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getLevelByTypeId(typeId) {
  try {
    console.log("getLevelByTypeId "+typeId+" call, try connect to server");
    if(typeId !== '1' && typeId !== '2'){
      typeId = 0;
    }
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
          .request()
          .input("typeId", sql.TinyInt, typeId)
          .query("SELECT * FROM rms_lv where type_id = @typeId");
    console.log("getLevelByTypeId complete");
    console.log("====================");
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getTool() {
  try {
    console.log("getTool call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool.request().query("SELECT * FROM rms_tools");
    console.log("getTool complete");
    console.log("====================");
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getRef() {
  try {
    console.log("getRef call, try connect to server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool.request().query("SELECT * FROM rms_ref");
    console.log("getRef complete");
    console.log("====================");
    return result.recordsets[0];
  } catch (error) {
    console.error(error);
    return { status: "error", message: error.message };
  }
}

async function getImage(task_id) {
  try {
    console.log("getImage call try to connect server");
    let pool = await sql.connect(config);
    console.log("connect complete");
    let result = await pool
      .request()
      .input("task_id", sql.VarChar, task_id)
      .query("SELECT * FROM rms_file WHERE task_id = @task_id");
    let jsonData = [];
    // const jsonData = {
    //   id: result.recordset[0].id,
    //   data: Buffer.from(result.recordset[0].data).toString(),
    // };
    const temp = result.recordsets[0];
    for(let i=0;i<temp.length;i+=1){
      jsonData.push(
        {
            id: temp[i].id,
            data: Buffer.from(temp[i].data).toString(),
          }
      );
    }
    console.log("getImage complete");
    console.log("====================");
    return jsonData;
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
  getTaskByStatus: getTaskByStatus,
  getTaskById: getTaskById,
  getReviewTask: getReviewTask,
  getDeptReviewById: getDeptReviewById,
  getReviewCos: getReviewCos,
  getReReviewDeptByTaskId: getReReviewDeptByTaskId,
  addReviewTask: addReviewTask,
  updateTask: updateTask,
  considerTask: considerTask,
  evaluateTask: evaluateTask,
  newDeptReview: newDeptReview,
  getType: getType,
  getSubType: getSubType,
  getTypeSubject: getTypeSubject,
  getTypeSubjectByTypeId: getTypeSubjectByTypeId,
  getLevelByTypeId: getLevelByTypeId,
  getTool: getTool,
  getRef: getRef,
  getImage: getImage,
  getVersion: getVersion,
};
