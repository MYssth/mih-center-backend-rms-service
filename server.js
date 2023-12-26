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

const UPLOAD_PATH = path.join(process.env.imgPath, "/RMS");
mkdirp.sync(path.join(process.env.imgPath, "/RMS"));

const storage = multer.diskStorage({
  destination: (req, file, done) => {
    done(null, UPLOAD_PATH);
  },
  filename: (req, file, done) => {
    done(null, uuid() + "___" + file.originalname);
    // fileCounter += 1;
    // done(null, fileCounter + ".jpg");
    // done(null, "nouse.jpg");
  },
});

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

const upload = multer({ storage, limits, fileFilter }).array("image", 5);

async function imgUpload(file, index) {
  // console.log("Image " + index + " check");
  if (!file) {
    console.log("No image found to upload");
  } else {
    const newFilePath = path.join(UPLOAD_PATH, taskId + "_" + index + ".jpg");
    // save newFilePath in your db as image path
    await sharp(file.path).resize().jpeg({ quality: 50 }).toFile(newFilePath);
    fs.unlinkSync(file.path);

    // console.log("Image " + index + " upload complete");
  }
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
      console.log("Image upload");
      for (let i = 0; i < files.length; i += 1) {
        await imgUpload(files[i], i + 1);
      }
      console.log("Image upload complete");
      dboperations
        .newTask(data, taskId, request.files.length)
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

router.route("/cnsdrtask").patch((request, response) => {
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
