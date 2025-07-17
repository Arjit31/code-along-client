import { CodeEditor } from "../components/CodeEditor";
import { Videos } from "../components/Videos";

export function Code() {
  

  return (
    <div className="h-full w-full overflow-y-scroll overflow-x-hidden ">
      <Videos />
      <CodeEditor />
    </div>
  );
}
