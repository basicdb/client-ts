
import styles from "./page.module.css";

import { useBasic } from "@basictech/nextjs"

import { ClientComponent } from "./components"

async function test() {
  console.log("Running on server", process.env.TEST_VAR)
  
  const data = "Hello"
  return data
}


export default function Home() {
  


  const data = test()

  return (
    <main className={styles.main}>
      <div className={styles.description} style={{ display: "flex", flexDirection: "column", gap: "20px"}}>
        <h1>basictech + nextjs </h1>

        

        <div>
          <h2> auth </h2>

          
       
        </div>

        <div>
          <h2> client component </h2>
          <ClientComponent />
    
         
        </div>

        <div>
          <h2> server component </h2>
          <p> {data} </p>
        </div>

       
      </div>
    </main>
  );
}
