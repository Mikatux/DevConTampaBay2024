import { PubSub } from "@google-cloud/pubsub";
require("dotenv").config({
  path: "../.env",
});
let projectId = process.env.PROJECT_ID;
const pubsub = new PubSub({ projectId });

const main = async () => {
  const userId = "user-id";
  const prompt = "A dog playing piano in a concert hall.";
  const style = "realistic";
  const topic = pubsub.topic(process.env.TOPIC_NAME);

  await topic.publishMessage({
    data: Buffer.from(
      JSON.stringify({
        userId,
        prompt,
        style,
      })
    ),
  });
};
main();
