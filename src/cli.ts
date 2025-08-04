import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { spawn } from 'node:child_process'
import { OpenAI } from 'openai'
import * as dotenv from 'dotenv'

dotenv.config({ quiet:true })

const client = new OpenAI()
const model = 'gpt-3.5-turbo'

const r1 = createInterface({ input: stdin, output:stdout })

const systemMessage = `
你是位经验丰富的Linux专家，熟悉各种终端命令和操作，擅于理解用户任务并将任务描述转换为可执行的
shell命令，请根据用户任务的自然语言描述，输入合理有效的linux命令。要求只输出bash命令字符串，
不要输出多余内容。
`

function exec(command:string, ...args:string[]) {
  return new Promise((resolve, reject)=>{
    const subProcess = spawn(command, args)
  
    let output = '', error = ''

    subProcess.stdout.on('data', data=>output+=data.toString())
    subProcess.stderr.on('data', data=>error+=data.toString())

    subProcess.on('close', code=>code === 0 ? resolve(output) : reject(error))
  })
}

function parse(output:string) {
  if (output.trim().startsWith('```')) {
    return output.replace(/\`\`\`bash([\s\S]+)\`\`\`/, (_, command) => command).trim()
  }
  return output
}

async function chat(query:string) {
  const completion = await client.chat.completions.create({
    model,
    messages:[
      {role:'system', content:systemMessage},
      {role:'user', content: query}
    ],
    temperature:0.001
  })
  const aiMessage = completion.choices[0].message
  return aiMessage.content
}

async function run() {
  while (true) {
    const userInput = await r1.question('>>> ')    

    if (/^(quit|exit)$/.test(userInput)) {
      r1.close()
      break
    }

    const response = await chat(userInput)
    const [command, ...args] = parse(response).split(/\s+/)
    
    try {
      const output = await exec(command, ...args)

      console.log(command, args)
      console.log(output)
    } catch(e) {
      console.error(e)

    }

  }
}

run()

