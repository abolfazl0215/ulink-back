const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema({
  font: String,
  textColor: String,
  background: String,
  address: String,
  mainImage: String,
  title: String,
  subTitle: String,
  job: String,
  imageUrl: { type: String, default: "" },
  theme: { type: String, default: "noTheme" },
  font: { type: String, default: "" },
  link: { type: String, default: "" },
  sections: [
    {
      type: { type: String, default: "" },
      text: { type: String, default: "" },
      title: { type: String, default: "" },
      subTitle: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
      line: { type: String, default: "" },
      space: { type: String, default: "" },
      columnTotal: { type: Number },
      link: { type: String, default: "" },
      animation: { type: String, default: "" },
      videoUrl: { type: String, default: "" },
      size: { type: String, default: "" },
      align: { type: String, default: "" },
      isVisible: { type: Boolean },
      uniqueId: { type: String, default: "" },
      blocks: [
        {
          id: { type: Number },
          social: { type: String, default: "" },
          message: { type: String, default: "" },
          faName: { type: String, default: "" },
          imageUrl: { type: String, default: "" },
          link: { type: String, default: "" },
          text: { type: String, default: "" },
          type: { type: String, default: "" },
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          question: { type: String, default: "" },
          answer: { type: String, default: "" },
          border: { type: String, default: "" },
          size: { type: String, default: "" },
          align: { type: String, default: "" },
        },
      ],
    },
  ],
});
const Link = mongoose.model("Link", linkSchema);

module.exports = Link;
