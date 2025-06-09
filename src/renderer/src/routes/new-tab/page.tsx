import { WelcomePage } from "@/components/welcome/main";

function Page() {
  return <WelcomePage />;
}

function App() {
  return (
    <>
      <title>Welcome | Snow Browser</title>
      <Page />
    </>
  );
}

export default App;
