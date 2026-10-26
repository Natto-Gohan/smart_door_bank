import mqtt from "mqtt";

let client: mqtt.MqttClient | null = null;

const TOPIC_COMMAND = "@msg/smartdoor/door/command";
const TOPIC_STATUS = "@msg/smartdoor/door/status";
const TOPIC_EVENT = "@msg/smartdoor/access/event";
const TOPIC_CAMERA = "@msg/smartdoor/camera/status";


export function connectMQTT(
  onMessage: (topic: string, message: string) => void
) {
  if (client) {
    return client;
  }

  const url = process.env.NEXT_PUBLIC_MQTT_URL;
  const username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;
  const clientId = process.env.NEXT_PUBLIC_MQTT_CLIENT_ID;

  if (!url || !username || !clientId) {
    console.error("Missing MQTT configuration in .env.local");
    return null;
  }

  client = mqtt.connect(url, {
    username,
    password: password || undefined,
    clientId,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    clean: true,
  });

  client.on("connect", () => {
    console.log("NETPIE MQTT Connected");

    client?.subscribe(
      [TOPIC_STATUS, TOPIC_EVENT, TOPIC_CAMERA],
      (error) => {
        if (error) {
          console.error("MQTT subscribe failed:", error.message);
        } else {
          console.log("Subscribed to Smart Door topics");
        }
      }
    );
  });

  client.on("message", (topic, payload) => {
    onMessage(topic, payload.toString());
  });

  client.on("reconnect", () => {
    console.log("Reconnecting to NETPIE...");
  });

  client.on("error", (error) => {
    console.error("MQTT Error:", error.message);
  });

  return client;
}

export function unlockDoor() {
  if (!client?.connected) {
    console.error("Cannot unlock: MQTT is disconnected");
    return;
  }

  client.publish(TOPIC_COMMAND, "UNLOCK", (error) => {
    if (error) console.error("Unlock publish failed:", error.message);
    else console.log("UNLOCK command published");
  });
}

export function lockDoor() {
  if (!client?.connected) {
    console.error("Cannot lock: MQTT is disconnected");
    return;
  }

  client.publish(TOPIC_COMMAND, "LOCK", (error) => {
    if (error) console.error("Lock publish failed:", error.message);
    else console.log("LOCK command published");
  });
}
