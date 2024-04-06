import sharp from "sharp";
import axios from "axios";
const styleToModel = {
  realistic: "juggernautxlv9rdphoto2lig",
};

const stableDiffusionApi = axios.create({
  baseURL: "https://modelslab.com/api/v6",
  headers: {
    "Content-Type": "application/json",
  },
});
class ImageDownloader {
  maxAptempt = 10;
  isGenerated = false;
  pngImageUrl = "";
  modelslabApiKey = process.env.MODELLABS_KEY;
  constructor(prompt, style) {
    this.model = styleToModel[style];
    this.prompt = prompt;
  }
  _downloadImage = async () => {
    if (this.isRunning) {
      throw new Error("Download is already processing");
    }
    let attempt = 0;
    do {
      try {
        const { data } = await axios.get(this.pngImageUrl, {
          responseType: "arraybuffer",
        });
        return data;
      } catch (error) {
        console.error("Can't download image:", this.pngImageUrl);
      }
      attempt++;
      if (attempt > 10) {
        throw new Error("Image are too long to download");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (true);
  };
  _generateImage = async () => {
    let response;
    if (this.model === undefined) {
      console.log("🔄 Generating image realtime");

      response = await stableDiffusionApi.post("/realtime/text2img", {
        key: this.modelslabApiKey,
        prompt: this.prompt,
        negative_prompt: "bad quality",
        width: "512",
        height: "512",
        safety_checker: false,
        seed: null,
        samples: 1,
        base64: false,
        webhook: null,
        track_id: null,
      });
    } else {
      console.log("🔄 Generating image with model:", this.model);

      response = await stableDiffusionApi.post("/images/text2img", {
        key: this.modelslabApiKey,
        model_id: this.model,
        prompt: this.prompt,
        negative_prompt: "CGI, Unreal, Airbrushed, Digital",
        width: "512",
        height: "512",
        samples: "1",
        num_inference_steps: "12",
        safety_checker: "no",
        enhance_prompt: "yes",
        seed: null,
        guidance_scale: 2,
        multi_lingual: "no",
        panorama: "no",
        self_attention: "no",
        upscale: "yes",
        embeddings_model: null,
        lora_model: null,
        tomesd: "yes",
        use_karras_sigmas: "yes",
        vae: null,
        lora_strength: null,
        scheduler: "DDPMScheduler",
        webhook: null,
        track_id: null,
      });
    }
    if (response.data.status !== "success") {
      let status = response.data.status;
      let attempt = 0;
      do {
        console.log("🔄 Wait image generation");
        try {
          const { data } = await stableDiffusionApi.post(
            `realtime/fetch/${response.data.id}`,
            {
              key: this.modelslabApiKey,
            }
          );
          status = data.status;
          if (status === "success") {
            this.pngImageUrl = data.output[0];
            return;
          }
        } catch (error) {
          console.error("Can't fetch image status");
        }
        attempt++;
        if (attempt > 60) {
          throw new Error("Image are too long to generate");
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } while (status !== "success");
    }
    this.pngImageUrl = response.data.output[0];
  };
  _convertImageToJpg = (buffer) => {
    return sharp(buffer)
      .jpeg({
        mozjpeg: true,
      })
      .toBuffer();
  };
  generate = async () => {
    this.isGenerated = false;
    await this._generateImage();
    const pngBuffer = await this._downloadImage();
    this.jpgBuffer = await this._convertImageToJpg(pngBuffer);
    this.isGenerated = true;
    return this.jpgBuffer;
  };
}

export default ImageDownloader;
