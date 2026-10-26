"use client";

import { useEffect, useState } from "react";
import {
  connectMQTT,
  unlockDoor,
  lockDoor,
} from "@/lib/mqtt";

const TOPIC_STATUS = "@msg/smartdoor/door/status";
const TOPIC_EVENT = "@msg/smartdoor/access/event";

export default function Home() {
  const [doorStatus, setDoorStatus] = useState("UNKNOWN");
  const [mqttStatus, setMqttStatus] = useState("Connecting...");
  const [lastEvent, setLastEvent] = useState("ไม่มีข้อมูล");
  const [commandMessage, setCommandMessage] = useState("");

  const cameraURL = process.env.NEXT_PUBLIC_CAMERA_URL?.replace(/\/+$/, "");

  useEffect(() => {
    let active = true;

    const client = connectMQTT((topic, message) => {
      console.log("[Dashboard] MQTT received:", { topic, message });


      if (topic.trim() === TOPIC_STATUS) {
  const status = message.trim().toUpperCase();

  console.log("[Dashboard] Updating door status:", status);

  if (status === "LOCKED" || status === "UNLOCKED") {
    setDoorStatus(status);
  } else {
    console.warn("[Dashboard] Unknown door status:", message);
  }
}

      if (topic === TOPIC_EVENT) {
        try {
          const data = JSON.parse(message);

          setLastEvent(
            `${data.method ?? "ไม่ระบุ"} | UID: ${data.uid ?? "-"} | ${
              data.result ?? message
            }`
          );
        } catch {
          setLastEvent(message);
        }
      }
    });

    if (!client) {
      setMqttStatus("Connection Error");
      console.error("[Dashboard] MQTT client was not created");
      return () => {
        active = false;
      };
    }

    const onConnect = () => {
      if (!active) return;
      console.log("[Dashboard] MQTT connected");
      setMqttStatus("Connected");
    };

    const onClose = () => {
      if (!active) return;
      console.warn("[Dashboard] MQTT connection closed");
      setMqttStatus("Disconnected");
    };

    const onOffline = () => {
      if (!active) return;
      console.warn("[Dashboard] MQTT offline");
      setMqttStatus("Disconnected");
    };

    const onError = (error: Error) => {
      console.error("[Dashboard] MQTT error:", error.message);
      if (active) setMqttStatus("Connection Error");
    };

    client.on("connect", onConnect);
    client.on("close", onClose);
    client.on("offline", onOffline);
    client.on("error", onError);

    if (client.connected) {
      onConnect();
    }

    return () => {
      active = false;
      client.off("connect", onConnect);
      client.off("close", onClose);
      client.off("offline", onOffline);
      client.off("error", onError);
    };
  }, []);

  const connected = mqttStatus === "Connected";
  const unlocked = doorStatus === "UNLOCKED";
  const locked = doorStatus === "LOCKED";

  const doorLabel = doorStatus;

  const sendCommand = (action: "unlock" | "lock") => {
    if (!connected) {
      setCommandMessage("MQTT ยังไม่เชื่อมต่อ กรุณารอสักครู่");
      return;
    }

    if (action === "unlock") {
      unlockDoor();
      setCommandMessage(
        "ส่งคำสั่งเปิดแล้ว กำลังรอสถานะยืนยันจาก ESP32"
      );
      console.log("[Dashboard] Requested UNLOCK");
    } else {
      lockDoor();
      setCommandMessage(
        "ส่งคำสั่งล็อกแล้ว กำลังรอสถานะยืนยันจาก ESP32"
      );
      console.log("[Dashboard] Requested LOCK");
    }
  };

  return (
    <main className="page">
      <header className="banner">
        <div className="banner-content">
          <div className="brand-icon">⌂</div>

          <div className="banner-text">
            <div className="eyebrow">IOT SECURITY SYSTEM</div>
            <h1>
              Smart Door <span>Dashboard</span>
            </h1>
            <p>ระบบควบคุมประตูอัจฉริยะด้วย ESP32 และ NETPIE</p>
          </div>
        </div>

        <div className="connection">
          <span className={`dot ${connected ? "online" : "offline"}`} />
          <div>
            <small>MQTT CONNECTION</small>
            <strong>{mqttStatus}</strong>
          </div>
        </div>
      </header>

      <section className="panel" id="door">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ACCESS CONTROL</span>
            <h2>Door Control</h2>
            <p>ควบคุมการเปิดและล็อกประตู</p>
          </div>
          <span className="section-icon">▣</span>
        </div>

        <div className="door-box">
          <div className={`door-symbol ${unlocked ? "door-open" : ""}`}>
            {unlocked ? "↗" : "▣"}
          </div>
          <div className="door-info">
            <span>สถานะประตูปัจจุบัน</span>
            <strong
              className={
                unlocked
                  ? "green-text"
                  : locked
                    ? "blue-text"
                    : "muted-text"
              }
            >
              {doorLabel}
            </strong>
            <small>
              {locked || unlocked
                ? "ได้รับสถานะจาก MQTT"
                : "รอข้อความสถานะจาก ESP32"}
            </small>
          </div>
        </div>

        <div className="actions">
          <button
            className="action unlock"
            onClick={() => sendCommand("unlock")}
            disabled={!connected}
          >
            <span className="action-symbol">↗</span>
            <span>
              <strong>เปิดประตู</strong>
              <small>UNLOCK DOOR</small>
            </span>
          </button>

          <button
            className="action lock"
            onClick={() => sendCommand("lock")}
            disabled={!connected}
          >
            <span className="action-symbol">▣</span>
            <span>
              <strong>ล็อกประตู</strong>
              <small>LOCK DOOR</small>
            </span>
          </button>
        </div>

        {commandMessage && (
          <div className="message" role="status">
            {commandMessage}
            <button
              onClick={() => setCommandMessage("")}
              aria-label="ปิด"
            >
              ×
            </button>
          </div>
        )}

        <p className="note">
          ⓘ สถานะประตูจะแสดงตามข้อความที่ได้รับจาก MQTT
        </p>
      </section>

      <section className="panel" id="camera">
        <div className="section-heading">
          <div>
            <span className="eyebrow">VISUAL MONITORING</span>
            <h2>Live Camera</h2>
            <p>ภาพจาก ESP32-CAM</p>
          </div>
          <span className="live-label">
            <span className="dot online" /> LIVE
          </span>
        </div>

        <div className="camera-frame">
          {cameraURL ? (
            <img
              src={`${cameraURL}/stream`}
              alt="ESP32-CAM Live Stream"
            />
          ) : (
            <div className="camera-empty">
              <span>◉</span>
              <strong>Camera URL not configured</strong>
              <p>กรุณาตั้งค่า NEXT_PUBLIC_CAMERA_URL</p>
            </div>
          )}
        </div>

        {cameraURL && (
          <p className="camera-address">
            SOURCE: {cameraURL}/stream
          </p>
        )}
      </section>

      <section className="panel" id="events">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ACCESS MONITORING</span>
            <h2>Last Access</h2>
            <p>เหตุการณ์เข้าใช้งานล่าสุด</p>
          </div>
          <span className="section-icon">≡</span>
        </div>

        <div className="event-box">
          <div className="event-icon">↳</div>
          <div className="event-content">
            <strong>Access Event</strong>
            <p>{lastEvent}</p>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #080e19;
          color: #e8f0ff;
          font-family: 'Inter', 'IBM Plex Sans Thai', sans-serif;
        }

        .page {
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
          padding: 34px;
        }

        .banner {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 34px;
          min-height: 180px;
          border: 1px solid #25456b;
          border-radius: 18px;
          background:
            radial-gradient(ellipse at 85% 0%, #145ca044, transparent 40%),
            linear-gradient(120deg, #122640, #0c1729 72%);
          box-shadow: 0 18px 55px #00000024;
        }

        .banner::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          right: -90px;
          top: -150px;
          border: 1px solid #4b9dff24;
          border-radius: 50%;
          box-shadow: 0 0 0 30px #4b9dff08, 0 0 0 60px #4b9dff05;
          pointer-events: none;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 22px;
          z-index: 1;
        }

        .brand-icon {
          width: 68px;
          height: 68px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: linear-gradient(140deg, #56bdff, #2477f0);
          color: white;
          font-size: 42px;
          font-weight: 800;
          box-shadow: 0 8px 30px #2585ff33;
        }

        .eyebrow {
          color: #78baff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.6px;
        }

        .banner h1 {
          margin: 9px 0;
          font-size: clamp(24px, 3.2vw, 36px);
          line-height: 1.2;
          letter-spacing: -1px;
        }

        .banner h1 span { color: #56aaff; }

        .banner p {
          margin: 0;
          color: #a8bdd9;
          font-size: 13px;
          line-height: 1.8;
        }

        .connection {
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          border: 1px solid #304965;
          border-radius: 12px;
          background: #081525aa;
          white-space: nowrap;
        }

        .connection small, .connection strong { display: block; }
        .connection small { color: #8199b9; font-size: 9px; letter-spacing: 1px; }
        .connection strong { margin-top: 5px; font-size: 12px; }

        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 50%;
        }

        .online { background: #25df98; box-shadow: 0 0 12px #25df9866; }
        .offline { background: #ff647c; box-shadow: 0 0 12px #ff647c66; }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .status-card, .panel {
          position: relative;
          overflow: hidden;
          border: 1px solid #203650;
          border-radius: 14px;
          background: linear-gradient(145deg, #101d30, #0c1626);
        }

        .status-card { padding: 21px; }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .card-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          font-size: 23px;
        }

        .card-icon.blue { background: #163758; color: #72b8ff; }
        .card-icon.green { background: #123b30; color: #25df98; }
        .card-icon.purple { background: #2a2550; color: #b8a7ff; }

        .card-label {
          color: #8196b4;
          font-size: 9px;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .status-card h2 {
          margin: 20px 0 6px;
          font-size: clamp(15px, 1.8vw, 21px);
          overflow-wrap: anywhere;
        }

        .status-card p {
          color: #8399b8;
          font-size: 11px;
          margin: 0;
          line-height: 1.7;
        }

        .green-text { color: #25df98 !important; }
        .red-text { color: #ff7187 !important; }
        .blue-text { color: #72b8ff !important; }
        .muted-text { color: #91a2ba !important; }

        .bottom-line {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
        }

        .green-line { background: #25df98; }
        .red-line { background: #ff647c; }
        .blue-line { background: #4a9cff; }
        .gray-line { background: #52627a; }

        .panel {
          padding: 25px;
          margin-top: 20px;
        }

        .section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 23px;
        }

        .section-heading h2 {
          margin: 7px 0 0;
          font-size: 20px;
          letter-spacing: -.4px;
        }

        .section-heading p {
          margin: 7px 0 0;
          color: #879bb8;
          font-size: 12px;
          line-height: 1.7;
        }

        .section-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #153557;
          color: #72b8ff;
          font-size: 24px;
        }

        .door-box {
          display: flex;
          align-items: center;
          gap: 17px;
          padding: 22px;
          border: 1px solid #273c58;
          border-radius: 12px;
          background: #091422;
        }

        .door-symbol {
          width: 60px;
          height: 60px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: #173653;
          color: #72b8ff;
          font-size: 30px;
        }

        .door-open { background: #123b30; color: #25df98; }

        .door-info span, .door-info strong, .door-info small { display: block; }
        .door-info span { color: #8da2bf; font-size: 11px; }
        .door-info strong { margin: 5px 0; font-size: 25px; overflow-wrap: anywhere; }
        .door-info small { color: #8196b4; font-size: 10px; }

        .actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          min-height: 78px;
          padding: 13px;
          border: 1px solid transparent;
          border-radius: 11px;
          color: white;
          cursor: pointer;
          transition: filter .2s, transform .2s;
        }

        .action:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }

        .action:disabled { opacity: .4; cursor: not-allowed; }

        .unlock {
          background: linear-gradient(120deg, #087b5d, #0eb580);
          border-color: #25df9844;
        }

        .lock {
          background: linear-gradient(120deg, #a72c48, #ed4565);
          border-color: #ff647c44;
        }

        .action-symbol { font-size: 28px; font-weight: 700; }
        .action strong, .action small { display: block; text-align: left; }
        .action strong { font-size: 13px; }
        .action small { margin-top: 5px; font-size: 9px; opacity: .8; }

        .message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          padding: 11px 14px;
          border: 1px solid #27496b;
          border-radius: 9px;
          background: #10243a;
          color: #a9d3ff;
          font-size: 11px;
        }

        .message button {
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 20px;
          cursor: pointer;
        }

        .note {
          margin: 15px 0 0;
          color: #8196b4;
          font-size: 10px;
          line-height: 1.8;
        }

        .live-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 11px;
          border-radius: 7px;
          background: #103126;
          color: #25df98;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .7px;
        }

        .camera-frame {
          display: grid;
          place-items: center;
          overflow: hidden;
          width: 100%;
          min-height: 250px;
          aspect-ratio: 16 / 9;
          border: 1px solid #263c58;
          border-radius: 11px;
          background: #060b13;
        }

        .camera-frame img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .camera-empty {
          text-align: center;
          padding: 30px 15px;
          color: #8196b4;
        }

        .camera-empty > span {
          display: block;
          margin-bottom: 12px;
          color: #72b8ff;
          font-size: 38px;
        }

        .camera-empty strong { color: #dce8fa; font-size: 13px; }
        .camera-empty p { font-size: 11px; line-height: 1.7; }

        .camera-address {
          margin: 12px 0 0;
          color: #8196b4;
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .event-box {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          border: 1px solid #263c58;
          border-radius: 11px;
          background: #091422;
        }

        .event-icon {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          flex: 0 0 auto;
          border-radius: 11px;
          background: #153557;
          color: #72b8ff;
          font-size: 25px;
        }

        .event-content { min-width: 0; }
        .event-content strong { font-size: 12px; }
        .event-content p {
          margin: 7px 0 0;
          color: #9aacc5;
          font-size: 11px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        @media (max-width: 760px) {
          .page { padding: 16px; }
          .banner {
            align-items: flex-start;
            flex-direction: column;
            padding: 23px;
            gap: 22px;
          }
          .banner-content { gap: 14px; }
          .brand-icon { width: 52px; height: 52px; font-size: 32px; }
          .banner h1 { font-size: 25px; }
          .banner p { font-size: 11px; }
          .connection { padding: 11px 13px; }
          .status-grid { grid-template-columns: 1fr; gap: 12px; }
          .status-card { padding: 18px; }
          .status-card h2 { margin-top: 13px; font-size: 19px; }
          .panel { padding: 18px; margin-top: 15px; }
          .section-heading h2 { font-size: 18px; }
          .door-box { padding: 16px; gap: 12px; }
          .door-symbol { width: 48px; height: 48px; font-size: 25px; }
          .door-info strong { font-size: 21px; }
          .actions { gap: 9px; }
          .action { gap: 8px; min-height: 70px; }
          .action-symbol { font-size: 23px; }
          .action strong { font-size: 12px; }
          .action small { font-size: 8px; }
          .camera-frame { min-height: 200px; }
        }

        @media (max-width: 380px) {
          .page { padding: 10px; }
          .banner { padding: 17px; }
          .banner-content { align-items: flex-start; }
          .banner h1 { font-size: 21px; }
          .panel { padding: 14px; }
          .actions { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
