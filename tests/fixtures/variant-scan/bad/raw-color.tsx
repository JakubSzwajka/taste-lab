// @ts-nocheck
export default function Bad() {
  return (
    <div className="bg-blue-500 hover:text-red-600 text-white border-[#333] bg-[oklch(0.5_0.1_20)]">
      <span style={{ color: "#ff0000" }}>x</span>
      <span style={{ background: "rgb(0 0 0)" }}>y</span>
    </div>
  );
}
