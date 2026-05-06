import { useState } from "react";

const colorByStatus = {
  working: "bg-[#32CD32]",
  "not-working": "bg-[#FF0000]",
  active: "bg-brand-500",
  faulty: "bg-ember-500",
  maintenance: "bg-ambertone-500"
};

const CameraWaffle = ({ cameras, onSelect, selectedCameraId }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12">
        {cameras.map((camera) => {
          const cameraKey = camera.id || camera._id;
          const shortId = (camera.cameraId && camera.cameraId.split("-").pop()) || camera.id;
          return (
            <button
              key={cameraKey}
              onClick={() => onSelect(camera)}
              onMouseEnter={() => setHovered(cameraKey)}
              onMouseLeave={() => setHovered(null)}
              className={`group relative h-10 rounded-md transition duration-200 hover:scale-110 ${
                colorByStatus[camera.status] || "bg-slate-400"
              } ${selectedCameraId === cameraKey ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-200" : ""}`}
              title={`${camera.cameraId || camera.id} | ${camera.location || "Unknown"} | ${camera.status}`}
            >
              <span className="text-[10px] font-bold text-white/90">{shortId}</span>
              {hovered === cameraKey && (
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 w-max -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white">
                  {camera.name || camera.cameraId || camera.id} | {camera.status}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CameraWaffle;
