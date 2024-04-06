require("dotenv").config({
  path: "../.env",
});
import { Storage } from "@google-cloud/storage";
import { PubSub } from "@google-cloud/pubsub";
import { v4 as uuidv4 } from "uuid";
import ImageGenerator from "./ImageGenerator.js";

let projectId = process.env.PROJECT_ID;
const pubsub = new PubSub({ projectId });

const storage = new Storage();
const bucket = storage.bucket(process.env.BUCKET_NAME);

const saveImage = async (buffer, userId) => {
  const imgId = uuidv4();
  const filePath = `demo/${userId}/${imgId}.jpg`;
  const file = bucket.file(filePath);

  const imgUrl = await new Promise(async (resolve, reject) => {
    try {
      const exist = await file.exists();
      if (exist && exist[0]) {
        await file.delete();
      }
      file.save(
        buffer,
        {
          metadata: { contentType: "image/jpeg" },
          public: true,
          validation: "md5",
        },
        (error) => {
          if (error) {
            reject(error);
          }
          resolve(`https://storage.googleapis.com/${bucket.name}/${file.name}`);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
  console.log("✅ Image saved in storage");

  const image = {
    id: imgId,
    url: imgUrl,
    name: "image.jpg",
  };
  return image;
};

const processMessage = async (style, prompt, userId) => {
  console.log("🔧 Generating image with style", style, "and prompt", prompt);
  const generator = new ImageGenerator(prompt, style);
  const imgJpg = await generator.generate();
  return saveImage(imgJpg, userId);
};

const main = async () => {
  const topic = pubsub.topic(process.env.TOPIC_NAME);
  let subscription = topic.subscription("image-downloader");
  //await subscription.delete();
  if (!(await subscription.exists())[0]) {
    subscription = (
      await topic.createSubscription("image-downloader", {
        flowControl: {
          maxMessages: 1,
        },
      })
    )[0];
    console.log(`Subscription ${subscription.name} created.`);
  }

  subscription.on("message", async (message) => {
    try {
      const { style, prompt, userId } = JSON.parse(
        Buffer.from(message.data, "base64").toString()
      );
      const image = await processMessage(style, prompt, userId);
      console.log("✅ Image generation completed", image);
      message.ackWithResponse(image.url);
    } catch (error) {
      console.error(error);
      console.log("❌ Image generation error");
      message.nack();
    }
  });
  console.log("🚀 Image downloader is running");
};
main();
