const dboperations = require("./dboperations");

const fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
const dateFns = require("date-fns");
const multer = require("multer");
const mkdirp = require("mkdirp");
const sharp = require("sharp");
const path = require("path");
const { v4: uuid } = require("uuid");
const { request, response } = require("express");
var app = express();
var router = express.Router();

var config = require("./dbconfig");
const sql = require("mssql");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
  })
);
app.use("/api/rms", router);

router.use((request, response, next) => {
  //write authen here

  response.setHeader("Access-Control-Allow-Origin", "*"); //หรือใส่แค่เฉพาะ domain ที่ต้องการได้
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Credentials", true);

  // console.log("middleware");
  next();
});

router.route("/health").get((request, response) => {
  // console.log("health check");
  response.json({ status: 200 });
});

// let fileCounter = 0;
let taskId = "";

// const UPLOAD_PATH = path.join(process.env.imgPath, "/RMS");
// mkdirp.sync(path.join(process.env.imgPath, "/RMS"));

const storage = multer.memoryStorage();

const limits = {
  fileSize: 5 * 1024 * 1024,
};

const fileFilter = (request, file, done) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    done(null, true);
  } else {
    done(new Error("file type not supported"), false);
  }
};

const upload = multer({ storage, limits, fileFilter }).array("files",5);

// Function to convert image to base64
async function imageToBase64(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'base64', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function genNewTaskId() {
  let pool = await sql.connect(config);
  const result = await pool
    .request()
    .query("SELECT TOP (1) id FROM rms_tasks ORDER BY id DESC");

  if (result.recordset.length !== 0) {
    let tempYear = dateFns.format(dateFns.addYears(new Date(), 543), "yy");
    let tempMonth = dateFns.format(dateFns.addYears(new Date(), 543), "MM");
    let latestId = result.recordset[0].id;
    console.log("latest sched id = " + latestId);
    let year = `${latestId[0]}${latestId[1]}`;
    let month = `${latestId[2]}${latestId[3]}`;
    console.log("year = " + year);
    console.log("month = " + month);
    let nextNum = parseInt(`${latestId[4]}${latestId[5]}${latestId[6]}`) + 1;
    console.log("next num = " + nextNum);

    if (year !== tempYear || month !== tempMonth) {
      return dateFns.format(dateFns.addYears(new Date(), 543), "yyMM001");
    }

    return `${year}${month}${String(nextNum).padStart(3, "0")}`;
  } else {
    return dateFns.format(dateFns.addYears(new Date(), 543), "yyMM001");
  }
}

router.route("/task").post(async (request, response) => {
  console.log("generate new task id");
  taskId = await genNewTaskId();
  console.log("new task id = " + taskId);
  upload(request, response, async (err) => {
    if (err) {
      return response
        .status(400)
        .json({ success: false, message: err.message });
    }
    try {
      const data = request.body;
      const files = request.files;

      const base64Files = [];

      for (let i = 0; i < files.length; i += 1) {
        const fileBuffer = await sharp(files[i].buffer).resize().jpeg({ quality: 50 }).toBuffer();
        const base64String = fileBuffer.toString('base64');
        base64Files.push(base64String);
      }

      dboperations
        .newTask(data, taskId, base64Files)
        .then((result) => {
          response.json(result);
        })
        .catch((err) => {
          console.error(err);
          response.sendStatus(500);
        });
    } catch (error) {
      return response
        .status(500)
        .json({ success: false, message: error.message });
    }
  });
});

router.route("/task").get((request, response) => {
  dboperations
    .getTask()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/task/:id").get((request, response) => {
  dboperations
    .getTaskById(request.params.id)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/taskByStatus/:statusId").get((request, response) => {
  dboperations
    .getTaskByStatus(request.params.statusId)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/reviewTask/:psnId").get((request, response) => {
  dboperations
    .getReviewTask(request.params.psnId)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/deptReview/:id").get((request, response) => {
  dboperations
    .getDeptReviewById(request.params.id)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/reviewCos").get((request, response) => {
  dboperations
    .getReviewCos()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/reReviewDeptByTask/:id").get((request, response) => {
  dboperations
    .getReReviewDeptByTaskId(request.params.id)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/deptReview").post((request, response) => {
  let reviewData = { ...request.body };
  dboperations
    .addReviewTask(reviewData)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((err) => {
      console.error(err);
      response.setStatus(500);
    });
});

router.route("/task").patch((request, response) => {
  let data = { ...request.body };
  dboperations
    .updateTask(data)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((err) => {
      console.error(err);
      response.setStatus(500);
    });
});

router.route("/considerTask").patch((request, response) => {
  let data = { ...request.body };
  dboperations
    .considerTask(data)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((err) => {
      console.error(err);
      response.setStatus(500);
    });
});

router.route("/evaluateTask").patch((request, response) => {
  let data = { ...request.body };
  dboperations
    .evaluateTask(data)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((err) => {
      console.error(err);
      response.setStatus(500);
    });
});

router.route("/type").get((request, response) => {
  dboperations
    .getType()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/subtype").get((request, response) => {
  dboperations
    .getSubType()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/typesubject").get((request, response) => {
  dboperations
    .getTypeSubject()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/typesubject/:typeId").get((request, response) => {
  dboperations
    .getTypeSubjectByTypeId(request.params.typeId)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/level/:typeId").get((request, response) => {
  dboperations
    .getLevelByTypeId(request.params.typeId)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/tool").get((request, response) => {
  dboperations
    .getTool()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/ref").get((request, response) => {
  dboperations
    .getRef()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/getimage/:task_id").get((request, response) => {
  dboperations
    .getImage(request.params.task_id)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

router.route("/getversion").get((request, response) => {
  dboperations
    .getVersion()
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.setStatus(500);
    });
});

var port = process.env.PORT;
app.listen(port);
console.log("RMS API is running at " + port);
