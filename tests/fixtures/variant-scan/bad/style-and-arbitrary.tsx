// @ts-nocheck
export default function Bad() {
  const cls = `bg-[red] ${"x"}`;
  return (
    <div className="bg-[red] text-[tomato] border-[rebeccapurple]">
      <i className={`shadow-[0_0_0_1px_navy]`} />
      <i className="[color:red] [background:linear-gradient(red,blue)] [--x:#fff]" />
      <i className="text-[color:var(--primary)] hover:bg-[Red] data-[open]:bg-[white]" />
      <span style={{ color: "red" }}>x</span>
      <span style={{ color: "var(--primary)" }}>x</span>
      <span style={styles}>x</span>
      <span {...{ style: { backgroundColor: "blue" } }}>x</span>
      <span ref={(el) => (el.style.color = "x")}>x</span>
    </div>
  );
}
export const css = { color: "red", borderColor: "#abc", fill: "var(--x)" };
