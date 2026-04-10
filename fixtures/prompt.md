Ok so here is the thing... the project in this root folder is our POC for a payslip analyzer. We built it as a simple Node.js script that we run locally as a command-line, giving it a PDF or image file, and it uses it to hit the Gemini LLM API, analyze, then annotate the file an such. That's all nice and it works as a simple proof of concept. So far so good.

NOW to the REAL DEAL.... after we have POC, the next step is to actually built a web app that we can deploy and that is going to be on cloudflare. So, I copied over to this project's root a directory called `cloudflare-app`. Inside it you'll find a cloudflare related app structure from a different project that I deploy on cloudflare. However it isn't a barebones project exactly, meaning it has logic and screens of the other project which we don't need. Remember, we're building a payslip analyzer web app. So you'll likely need to do some cleaning and removal of the old copied over stuff in the `cloudflare-app` directory. But on the positive side, the existing project screens and backend is likely going to help you understand structure, components, etc.

So what is expected overall:
- in this root directory you have all the context for our POC including in the docs/ and src/ directories. Remember - we're building a payslip analyzer app so we want to maintain the overall patterns, logic, docs of what we established so far.
- all the logic really that we've built out of this POC probably needs to be within the cloudflare backend (a worker, and likely in the `cloudflare-app/backend` directory).
- let's ignore the frontend app part for a second and focus on porting and building the backend logic properly. to test it, you should expose an API route that accepts a payslip file, and returns the annotated output file as a response, along with the raw data points that were extracted from the payslip (like we put in console log output but actually return this in a proper JSON structured response).
- since we are focusing first on the backend part let's make sure we get it right. we likely need to address the following concerns:
  - let's work out a simple database schema for payslip data, users, and auth. there exist currently drizzle ORM so we can remove the old migrations and create a new one
  - we keep auth and want users to login before they can process any payslip info
  - you have at your disposal inside the cloudflare-app/backend/ directory a bunch of docs and references inside docs/ directory and the .cursor/ directory local to the cloudflare-app/backend/ directory
  - having a local functioning dev server for it 
- make sure you review and update the relevant cloudflare infra files like the wrangler config and all of those things
- this new app name is going to be called payslip-analyzer

What is out of scope: the frontend part is out of scope.

What you should pay attention to: we said we want to have auth enabled for users to interact with the app but then how will you test the payslip functionality works? likely you need to come up with some workaround so you can have tests working (maybe you mock the auth info, look at existing implementation from the app we copied over), and we need a handy script command to push a file over to the api. again, hint is to look into existing scripts in cloudflare-app/backend/scripts/ for your assistance and reference.

Primary goal is to get a functional backend API app that works locally and deploys to cloudflare successfully, that receives a payslip file from a user, analyzes it and returns back analysis data.
