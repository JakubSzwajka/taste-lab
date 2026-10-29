// @ts-nocheck
import confetti from "canvas-confetti";
import { Thing } from "./local";
import { x } from "@/components/other";

export default function Bad() {
  return <div onClick={() => confetti()}>{Thing}{x}</div>;
}
