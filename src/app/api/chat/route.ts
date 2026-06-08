import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
  organization: 'org-238jon6xJ6b22xDXceGfJWN8',
});

const ASSISTANT_ID = 'asst_C0KWLEQ5Fpkhlg3rV5yY8cPV';

export async function POST(req: NextRequest) {
  try {
    const { message, threadId } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400 });
    }

    let thread_id = threadId;
    if (!thread_id) {
      const thread = await openai.beta.threads.create();
      thread_id = thread.id;
    }

    await openai.beta.threads.messages.create(thread_id, {
      role: 'user',
      content: message,
    });

    // We manually construct the ReadableStream to intercept tool calls without breaking the frontend parser
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Immediately send the thread info so the frontend knows what thread we are on
        controller.enqueue(encoder.encode(JSON.stringify({ event: 'thread.info', data: { thread_id } }) + '\n'));

        try {
          const runStream = await openai.beta.threads.runs.stream(thread_id, {
            assistant_id: ASSISTANT_ID,
            model: 'gpt-4o-mini',
          });

          for await (const event of runStream) {
            // Print the event to the backend terminal
            if (event.event === 'thread.message.delta') {
              process.stdout.write(event.data.delta.content?.[0]?.text?.value || '');
            } else {
              console.log(`\n[SSE Event]: ${event.event}`);
            }

            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
            
            // Intercept Tool Calls
            if (event.event === 'thread.run.requires_action') {
              const toolCalls = event.data.required_action?.submit_tool_outputs?.tool_calls;
              
              if (toolCalls) {
                const toolOutputs = toolCalls.map((toolCall: any) => {
                  console.log(`\n[Tool Execution]: Executing ${toolCall.function.name}...`);
                  let output = 'Action not recognized';
                  
                  // Handle specific tool functions mentioned in your prompt
                  if (toolCall.function.name === 'query_faq_database') {
                    // Provide a dummy context for the FAQ tool
                    output = JSON.stringify({ 
                      context: "Employees get 20 days of paid time off per year. IT hardware requests take 3-5 business days. Remote work is allowed 2 days a week." 
                    });
                  } else if (toolCall.function.name === 'escalate_to_ticket') {
                    // Generate a random mock ticket ID for the ticketing tool
                    output = JSON.stringify({ 
                      ticket_id: "TKT-" + Math.floor(1000 + Math.random() * 9000) 
                    });
                  }
                  
                  return { tool_call_id: toolCall.id, output };
                });

                // Automatically submit the tool outputs back to the Assistant and resume streaming
                const submitStream = openai.beta.threads.runs.submitToolOutputsStream(
                  thread_id,
                  event.data.id,
                  { tool_outputs: toolOutputs }
                );

                for await (const submitEvent of submitStream) {
                  if (submitEvent.event === 'thread.message.delta') {
                    process.stdout.write(submitEvent.data.delta.content?.[0]?.text?.value || '');
                  } else {
                    console.log(`\n[SSE Event]: ${submitEvent.event}`);
                  }
                  controller.enqueue(encoder.encode(JSON.stringify(submitEvent) + '\n'));
                }
              }
            }
          }
        } catch (err: any) {
           console.error('Stream error:', err);
           controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), { status: 500 });
  }
}
