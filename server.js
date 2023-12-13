const dboperations = require("./dboperations");

var express = require("express");
const multer = require("multer");
var bodyParser = require("body-parser");
var cors = require("cors");
const { request, response } = require("express");
var app = express();
var router = express.Router();

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

// ในส่วนนี้จะเป็น configของMulter ว่าจะให้เก็บไฟล์ไว้ที่ไหน และ Rename ชื่อไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "//192.168.101.2/Sh/Mih_Center");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + ".png");
  },
});
// ใส่ Config ลงไป
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.send("Hello Upload");
});

// router.route("/").get((request, response) => {
//   response.send("Hello Upload");
// });

// สร้าง method POST ขึ้นมาและ ใส่ middleward upload โดนตั้งชื่อ paramที่จะรับว่า "file" ไว้หรือจะเป็นอย่างอื่นก็ได้ตามที่ต้องการ เข้าไป ส่วน.singleจะเป็นตัวกำหนดว่าอัพโหลดได้ทีละกี่ไฟล์ ลองไปอ่านใน Doc ของ Multer ดูครับ จะมี .single .array 9ล9
// app.post("/upload", upload.single("file"), (req, res) => {
//   // และให้ Response ค่าไฟล์ออกไป
//   res.send(req.file);
// });

router.route("/upload").post(upload.single("file"),(request, response) => {
  response.send(request.file);
});

router.route("/getprheader/:usr_req").get((request, response) => {
  dboperations
    .getPRHeader(request.params.usr_req)
    .then((result) => {
      response.json(result);
    })
    .catch((err) => {
      console.error(err);
      response.sendStatus(500);
    });
});

var port = process.env.PORT;
app.listen(port);
console.log("RMS API is running at " + port);
