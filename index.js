const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const request = require("request");
const bodyParser = require("body-parser");
const path = require("path");
const uuid = require("uuid").v4;
const multer = require("multer");
const helmet = require("helmet");
const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");

const fs = require("fs");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");

// پیکربندی Cloudinary
cloudinary.config({
  cloud_name: "dtakyi9mf",
  api_key: "588183267814191",
  api_secret: "pX-FbXATvi7couH36CFWn_PURf4",
  secure: true,
});

// const fileUpload = require("express-fileupload");

// multer برای دریافت فایل از فرم‌دیتا
// const upload = multer({ storage: multer.memoryStorage() });

const cookieParser = require("cookie-parser");

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const User = require("./models/User");
const Cart = require("./models/Cart");
const Plan = require("./models/Plan");
const Link = require("./models/Link");
const Gallery = require("./models/Gallery");
const ExampleLinks = require("./models/ExampleLinks");

const LoginRouter = require("./routes/login");
const GetLinksRouter = require("./routes/getLinks");
const GetLinkRouter = require("./routes/getLink");
const GetGalleryRouter = require("./routes/getGallery");
const GetAllUsersRouter = require("./routes/getAllUsers");

require("dotenv").config();

mongoose.connect(
  "mongodb+srv://xchat:Abolfazl021_@db1.6qsnqns.mongodb.net/?appName=db1",
);
const db = mongoose.connection;

db.on(
  "error",
  console.error.bind(console, "خطا در اتصال به پایگاه داده:"),
);
db.once("open", () => {
  console.log("connected to database");
});

const app = express();
const port = 3001;

// ایجاد فولدر uploads اگر وجود نداشته باشد
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// تنظیمات Multer برای ذخیره‌سازی محلی
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // مسیر ذخیره‌سازی
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${uuid()}${path.extname(
      file.originalname,
    )}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // محدودیت 5MB
  fileFilter: (req, file, cb) => {
    // فقط تصاویر مجاز
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("فقط فایل‌های تصویری مجاز هستند"));
    }
  },
});

// استفاده از Helmet برای افزودن امکانات امنیتی
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // اجازه دسترسی به تصاویر از دامنه‌های دیگر
  }),
);

// دسترسی استاتیک به فولدر public
app.use("/public", express.static(path.join(__dirname, "public")));

// استفاده از Helmet برای افزودن امکانات امنیتی
app.use(helmet());
// app.use(fileUpload());

app.use(cookieParser());

// تعیین مسیر انتقال از HTTP به HTTPS
app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] === "http") {
    res.redirect(`https://${req.hostname}${req.url}`);
  } else {
    next();
  }
});

app.use(express.json());
app.use(morgan("dev"));

// تنظیمات CORS
const corsOptions = {
  // origin: "http://localhost:3000", // آدرس فرانت‌اند شما
  origin: [
    "http://localhost:3000",
    process.env.FRONT_DOMAIN,
    "https://ulink-client.vercel.app",
  ],
  // origin: "https://pounes.ir", // آدرس فرانت‌اند شما
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // ارسال کوکی‌ها به ازای درخواست‌های Cross-Origin
};

app.use(cors(corsOptions));
// app.use(fileUpload());

// روت آپلود تصویر
app.post("/upload2", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "تصویری انتخاب نشده است",
      });
    }

    const fileName = `${Date.now()}-${uuid()}`;

    if (!req.file.buffer) {
      return res.status(400).json({ message: "فایل خراب است" });
    }

    // فشردگی و بهینه‌سازی تصویر با Sharp
    const compressedImageBuffer = await sharp(req.file.buffer)
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();

    // تبدیل buffer به base64
    const base64Image = compressedImageBuffer.toString("base64");
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    // آپلود به Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      public_id: fileName,
      folder: "uploads",
      resource_type: "image",
      format: "jpg",
      quality: 80,
      overwrite: true,
    });

    res.json({
      message: "تصویر با موفقیت آپلود و ذخیره شد",
      link: uploadResult.secure_url,
      filename: fileName,
      size: compressedImageBuffer.length,
      originalSize: req.file.size,
    });
  } catch (error) {
    console.error("خطا در ذخیره تصویر: ", error);
    res.status(500).json({
      message: "خطا در ذخیره تصویر",
      error: error.message,
    });
  }
});

// app.post("/upload2", upload.single("image"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ message: "تصویری انتخاب نشده است" });
//     }

//     const file = req.file; // فایل اصلی
//     const fileName = `${Date.now()}-${uuid()}.jpg`; // نام فایل

//     // تنظیم S3Client برای Liara Storage
//     const client = new S3Client({
//       region: "default",
//       endpoint: process.env.LIARA_ENDPOINT,
//       credentials: {
//         accessKeyId: process.env.LIARA_ACCESS_KEY,
//         secretAccessKey: process.env.LIARA_SECRET_KEY,
//       },
//     });

//     const params = {
//       Body: file.buffer, // فایل مستقیم بدون Base64
//       Bucket: process.env.LIARA_BUCKET_NAME,
//       Key: fileName,
//       ContentType: file.mimetype, // نوع MIME اصلی
//     };

//     await client.send(new PutObjectCommand(params));

//     const imageUrl = `https://hamrahlink.storage.c2.liara.space/${fileName}`;

//     res.json({
//       message: "تصویر با موفقیت آپلود و ذخیره شد",
//       link: imageUrl,
//     });
//   } catch (error) {
//     console.error("خطا در ذخیره تصویر: ", error);
//     res.status(500).json({ message: "خطا در ذخیره تصویر", error });
//   }
// });

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// دریافت نام کاربر و ذخیره در پایگاه داده
app.use("/", LoginRouter);

app.get("/checkExistUser", async (req, res) => {
  const token = req.cookies.token;
  console.log({ token });

  if (!token) {
    return res.status(401).json({ loggedIn: false });
  }

  return res.status(200).json({ loggedIn: true });
});

app.get("/me", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ loggedIn: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        NonesameSite:
          process.env.NODE_ENV === "production" ? "None" : "Lax",
      });
      return res.json({ loggedIn: false });
    }

    return res.json({ loggedIn: true, user });
  } catch (err) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      NonesameSite:
        process.env.NODE_ENV === "production" ? "None" : "Lax",
    });
    return res.json({ loggedIn: false });
  }
});

app.get("/logout", async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // فقط روی پروداکشن https
      sameSite:
        process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    });
    return res.json({ logout: true });
  } catch (err) {
    console.error("Logout error:", err);
    return res
      .status(500)
      .json({ logout: false, error: "Logout failed" });
  }
});

app.post("/removeLink", async (req, res) => {
  try {
    const { userId, link } = req.body;

    console.log({ userId, link });

    if (!userId || !link) {
      return res
        .status(400)
        .json({ message: "userId or link missing" });
    }

    // حذف لینک از مجموعه لینک‌ها
    await Link.findOneAndDelete({ address: link });

    const findUser = await User.findById(userId);
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // فیلتر کردن لینک از آرایه
    findUser.links = findUser.links.filter((f) => f !== link);
    await findUser.save();

    res.json({ message: "OK" });
  } catch (err) {
    console.error("Error removing link:", err);
    res.status(500).json({
      message: "Error removing link",
      error: err.toString(),
    });
  }
});

(app.post("/getMyLinks", async (req, res) => {
  const { links } = req.body;
  // const parsedLinks = JSON.parse(links);
  console.log({ links });

  const getLink = await Link.find({ address: { $in: links } });
  res.json({ links: getLink });
}),
  app.post("/getUser", async (req, res) => {
    const userId = req.body.userId;
    console.log("getUser -------", userId);
    try {
      const user = await User.findOne({ _id: userId });
      if (user) {
        res.json({ user });
      } else {
        res.json({ status: 404 });
      }
    } catch (err) {
      res.json({ status: 404 });
    }
  }));
// app.post("/addToCart", async (req, res) => {
//   console.log("body is :", req.body);
//   const { plan, userId, amount } = req.body;
//   try {
//     const findUser = await User.findOne({ _id: userId });
//     const copyCart = [...findUser.cart];
//     copyCart.push({ plan, total: 1, amount });
//     findUser.cart = copyCart;
//     await findUser.save();
//     res.json({
//       message: "محصول مورد نظر با موفقیت به سبد خرید شما اضافه شد",
//     });

//     console.log("userrrr : ", findUser);
//   } catch (error) {
//     console.log(error);
//   }
// });
// app.get("/getProducts", async (req, res) => {
//   try {
//     const plans = await Plan.find({});
//     res.json({ plans });
//   } catch (err) {
//     res.json({ status: 404 });
//   }
// });

// app.use("/add", async (req, res) => {
//   console.log(req.body);
//   try {
//     const newPlan = new Plan({
//       name: "A",
//       price: 589000,
//       options: [
//         {
//           option: "اتصال از راه دور",
//           value: "-",
//         },
//         {
//           option: "اتصال از راه دور",
//           value: "+",
//         },
//         {
//           option: "اتصال از راه دور",
//           value: "-",
//         },
//         {
//           option: "اتصال از راه دور",
//           value: "+",
//         },
//         {
//           option: "اتصال از راه دور",
//           value: "-",
//         },
//         {
//           option: "اتصال از راه دور",
//           value: "-",
//         },
//       ],
//     });
//     await newPlan.save();
//   } catch (error) {
//     console.log(error);
//   }
// });
// app.post("/setTotalCart", async (req, res) => {
//   const { userId, plan, total } = req.body;
//   console.log(req.body);
//   try {
//     const userFind = await User.findOne({ _id: userId });
//     console.log(
//       "user find",
//       userFind.cart.find((c) => c.plan == plan),
//     );
//     userFind.cart.find((c) => c.plan == plan).total = total;
//     await userFind.save();
//     res.json({ message: "عملیات بت موفقیت انجام شد" });
//   } catch (error) {
//     console.log(error);
//   }
// });
// app.post("/removeFromCart", async (req, res) => {
//   const { userId, plan } = req.body;
//   console.log(req.body);
//   try {
//     const userFind = await User.findOne({ _id: userId });
//     const filtered = userFind.cart.filter((f) => f.plan != plan);
//     userFind.cart = filtered;
//     await userFind.save();
//     res.json({ message: "عملیات بت موفقیت انجام شد" });
//   } catch (error) {
//     console.log(error);
//   }
// });
// app.post("/setAddress", async (req, res) => {
//   const { userId, address } = req.body;
//   try {
//     const userFind = await User.findOne({ _id: userId });
//     console.log(userFind);
//     const copyAddress = [...userFind.address];
//     copyAddress.push({ address });
//     userFind.address = copyAddress;
//     await userFind.save();
//     res.json({ message: "عملیات بت موفقیت انجام شد" });
//   } catch (error) {
//     console.log(error);
//   }
// });
app.use("/newLink", async (req, res) => {
  const { title, mainImage, subTitle, job, address, userId } =
    req.body;
  console.log({ mainImage });
  console.log("userId :", userId);
  try {
    const findUser = await User.findOne({ _id: userId });
    console.log({ findUser });
    const copyLinks = [...findUser.links];
    copyLinks.push(address);
    console.log(findUser.links);
    findUser.links = copyLinks;
    await findUser.save();
  } catch (error) {
    console.log(error);
  }
  try {
    const newLink = new Link({
      title,
      mainImage,
      subTitle,
      job,
      address,
      sections: [
        {
          type: "information",
          title,
          subTitle,
          imageUrl: mainImage,
        },
      ],
    });

    const savedLink = await newLink.save();
    // const newLinkCopy = [...savedLink.sections];
    // newLinkCopy.push({
    //   type: "information",
    //   title,
    //   subTitle,
    //   mainImage,
    // });
    // savedLink.sections = newLinkCopy;
    // await savedLink.save();
    res.json({ message: "لینک شما با موفقیت ساخته شد" });
  } catch (error) {
    console.error("خطا در ساخت لینک:", error);
    res.status(500).json({ message: "خطا در سرور", status: 500 });
  }
});
app.use("/findLink", async (req, res) => {
  const { link } = req.body;
  console.log(link);
  try {
    const findLink = await Link.findOne({ address: link });
    console.log(findLink);
    res.json({ message: "hiii", exist: findLink ? true : false });
  } catch (error) {
    console.log(error);
  }
});

app.post("/upload", async (req, res) => {
  const image = req.body.image;
  const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
  console.log("uploadd :", image);

  if (!image) {
    return res.json({ message: "تصویری انتخاب نشده است" });
  }

  const fileName = `${Date.now()}-${uuid()}.jpg`;

  const client = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT,
    credentials: {
      accessKeyId: process.env.LIARA_ACCESS_KEY,
      secretAccessKey: process.env.LIARA_SECRET_KEY,
    },
  });

  const params = {
    Body: Buffer.from(cleanBase64, "base64"),
    Bucket: process.env.LIARA_BUCKET_NAME,
    Key: fileName,
  };

  // save message in storage
  try {
    await client.send(new PutObjectCommand(params));
  } catch (error) {
    console.error("خطا در ذخیره تصویر: ", error);
    // callback({ message: "error save message in storage" });
  }

  const imageUrl = `https://hamrahlink.storage.c2.liara.space/${fileName}`;

  res.json({
    message: "تصویر با موفقیت آپلود و ذخیره شد",
    link: imageUrl,
  });
});
app.use("/addMessenger", async (req, res) => {
  const {
    title,
    blocks,
    type,
    videoUrl,
    imageUrl,
    link,
    address,
    line,
    space,
    animation,
    uniqueId,
  } = req.body;
  // const x =
  console.log({
    title,
    blocks,
    type,
    videoUrl,
    imageUrl,
    link,
    address,
    line,
    animation,
    uniqueId,
  });
  try {
    const findLink = await Link.findOne({ address });
    const linkSections = [...findLink.sections];
    linkSections.push({
      type,
      title,
      videoUrl,
      imageUrl,
      link,
      line,
      space,
      animation,
      uniqueId,
      blocks: blocks.map((b) => {
        return {
          social: b.social,
          imageUrl: b.imageUrl,
          link: b.link,
          message: b.message,
          text: b.text,
          title: b.title,
          subTitle: b.subTitle,
          type: b.type,
          description: b.description,
          question: b.question,
          answer: b.answer,
        };
      }),
    });
    findLink.sections = linkSections;
    await findLink.save();
    res.json({ message: "عملیات موفقیت آمیز بود" });
    // console.log("findLink :", findLink);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "خطا در سرور" });
  }
});
app.use("/setDrag", async (req, res) => {
  const { address, sections } = req.body;
  // const x =
  console.log({
    sections,
  });
  try {
    const findLink = await Link.findOne({ address });
    let linkSections = [...findLink.sections];
    linkSections = sections.map((s) => {
      return {
        type: s.type,
        title: s.title,
        videoUrl: s.videoUrl,
        imageUrl: s.imageUrl,
        link: s.link,
        line: s.line,
        animation: s.animation,
        space: s.space,
        subTitle: s.subTitle,
        uniqueId: s.uniqueId,
        blocks: s.blocks.map((b) => {
          return {
            social: b.social,
            imageUrl: b.imageUrl,
            link: b.link,
            message: b.message,
            text: b.text,
            title: b.title,
            type: b.type,
            description: b.description,
            question: b.question,
            answer: b.answer,
          };
        }),
      };
    });
    findLink.sections = linkSections;
    await findLink.save();
    res.json({ message: "عملیات موفقیت آمیز بود" });
    // console.log("findLink :", findLink);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "خطا در سرور" });
  }
});

app.use("/setEdit", async (req, res) => {
  const {
    title,
    blocks,
    type,
    videoUrl,
    imageUrl,
    link,
    address,
    id,
    line,
    space,
    animation,
    uniqueId,
  } = req.body;
  // const x =
  console.log({
    title,
    blocks,
    type,
    videoUrl,
    imageUrl,
    link,
    address,
    id,
    uniqueId,
  });
  try {
    const findLink = await Link.findOne({ address });
    console.log("findLink :", findLink);
    const linkSections = [...findLink.sections];
    let findSection = linkSections.find(
      (f) => f.uniqueId == uniqueId,
    );
    console.log("findSection :", findSection);
    findSection.type = type;
    findSection.title = title;
    findSection.videoUrl = videoUrl;
    findSection.imageUrl = imageUrl;
    findSection.link = link;
    findSection.line = line;
    findSection.space = space;
    findSection.animation = animation;
    findSection.uniqueId = uniqueId;
    findSection.blocks =
      findSection.blocks &&
      findSection.blocks[0] &&
      blocks.map((b) => {
        return {
          social: b.social,
          imageUrl: b.imageUrl,
          link: b.link,
          message: b.message,
          text: b.text,
          title: b.title,
          type: b.type,
          description: b.description,
          question: b.question,
          answer: b.answer,
        };
      });
    console.log("findSection2 :", findSection);
    findLink.sections = linkSections;
    await findLink.save();
    res.json({ message: "عملیات موفقیت آمیز بود" });
    // console.log("findLink :", findLink);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "خطا در سرور" });
  }
});

app.get("/getLinks", async (req, res) => {
  try {
    const links = await Link.find({});
    res.json({ links });
  } catch (err) {
    res.json({ status: 404 });
  }
});
app.post("/getLink", async (req, res) => {
  const { link } = req.body;
  try {
    const findLink = await Link.findOne({ address: link });
    res.json({ link: findLink });
  } catch (err) {
    res.json({ status: 404 });
  }
});
app.post("/deleteItem", async (req, res) => {
  const { address, id } = req.body;
  try {
    const findLink = await Link.findOne({ address: address });
    const filterSection = findLink.sections.filter(
      (f) => f.uniqueId != id,
    );
    findLink.sections = filterSection;
    await findLink.save();
    res.json({ message: "موفقیت آمیز بود" });
  } catch (err) {
    res.json({ status: 404 });
  }
});
app.post("/addTheme", async (req, res) => {
  const { address, theme } = req.body;
  try {
    const findLink = await Link.findOne({ address: address });
    findLink.theme = theme;
    await findLink.save();
    res.json({ message: "موفقیت آمیز بود" });
  } catch (err) {
    res.json({ status: 404 });
  }
});
app.post("/setFont", async (req, res) => {
  const { address, font } = req.body;
  try {
    const findLink = await Link.findOne({ address: address });
    findLink.font = font;
    await findLink.save();
    res.json({ message: "موفقیت آمیز بود" });
  } catch (err) {
    res.json({ status: 404 });
  }
});

app.post("/setGallery", async (req, res) => {
  const { imageUrl } = req.body;
  console.log({ imageUrl });
  try {
    let gallery = await Gallery.findOne({});
    console.log({ gallery });
    if (gallery) {
      gallery.url.push(imageUrl); // اضافه کردن imageUrl به آرایه url
    } else {
      gallery = new Gallery({ url: [imageUrl] }); // ایجاد یک شیء جدید از مدل Gallery
    }
    await gallery.save(); // ذخیره کردن تغییرات
    res.json({ message: "عملیات با موفقیت انجام شد" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "خطایی رخ داده است" });
  }
});

app.get("/getGallery", async (req, res) => {
  try {
    let gallery = await Gallery.find({});
    res.json({ gallery });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "خطایی رخ داده است" });
  }
});

// app.post("/setExampleLink", async (req, res) => {
//   const { link } = req.body;

//   try {
//     const exLink = new ExampleLinks({ url: link });
//     await exLink.save(); // ذخیره کردن تغییرات
//     res.json({ message: "عملیات با موفقیت انجام شد" });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "خطایی رخ داده است" });
//   }
// });
// app.get("/getExLinks", async (req, res) => {
//   try {
//     let exLinks = await ExampleLinks.find({});
//     res.json({ links: exLinks });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "خطایی رخ داده است" });
//   }
// });

app.get("/getAllUser", async (req, res) => {
  try {
    let user = await User.find({});
    res.json({ users: user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "خطایی رخ داده است" });
  }
});

// app.use("/addMessenger", async (req, res) => {
//   const { text, blocks, type } = req.body;
//   // console.log(req.body);
//   try {
//     const findLink = await Link.find({});
//     const linkSections = [...findLink[findLink.length - 1].sections];
//     linkSections.push({
//       type,
//       title: text,
//       blocks: [
//         blocks.map((b) => {
//           return {
//             social: b.social,
//             imageUrl: b.imageUrl,
//             link: b.link,
//             text: b.text,
//           };
//         }),
//       ],
//     });
//     findLink.sections = linkSections;
//     await findLink.save();
//     res.json({ message: "عملیات موفقیت آمیز بود" });
//     // console.log("linkID :", linkID);

//     console.log("findLink :", findLink);
//   } catch (error) {
//     console.log(error);
//   }
// });

app.listen(port, () => {
  console.log(`server is running in port:${port}`);
});
