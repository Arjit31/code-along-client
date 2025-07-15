import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import { Home } from "./routes/Home";
import { NoPage } from "./routes/NoPage";
import { Code } from "./routes/Code";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="code/:id" element={<Code />} />
          <Route path="*" element={<NoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
