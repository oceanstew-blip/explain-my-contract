import { describe, expect, it, vi } from 'vitest';
import {readAnalysisResponse, streamAnalysisResponse} from './analysis-stream';

describe('analysis progress transport', () => {
  it('keeps delivering progress during a 40-second operation', async () => {
    vi.useFakeTimers();
    try {
      const response = streamAnalysisResponse(async () => {
        await new Promise(resolve => setTimeout(resolve, 40_000));
        return Response.json({contract_id:'delayed'}, {status:201});
      }, new AbortController().signal, 'request_123456');
      const reader = response.body!.getReader();
      expect(new TextDecoder().decode((await reader.read()).value)).toContain('progress');
      await vi.advanceTimersByTimeAsync(35_000);
      for (let i=0;i<7;i++) expect(new TextDecoder().decode((await reader.read()).value)).toContain('progress');
      await vi.advanceTimersByTimeAsync(5_000);
      let final = '';
      while (true) { const chunk = await reader.read(); if (chunk.done) break; final += new TextDecoder().decode(chunk.value); }
      expect(final).toContain('"contract_id":"delayed"');
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it('sends progress immediately and restores a delayed validated result', async () => {
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>(resolve => { finish = resolve; });
    const streamed = streamAnalysisResponse(() => pending, new AbortController().signal, 'request_123456');
    const [preview, result] = streamed.body!.tee();
    const reader = preview.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('progress');
    void reader.cancel();
    finish(Response.json({contract_id:'fictional',recovery_token:'test-private-token'}, {status:201}));
    const restored = await readAnalysisResponse(new Response(result,{headers:streamed.headers}));
    expect(restored.status).toBe(201);
    expect(await restored.json()).toEqual({contract_id:'fictional',recovery_token:'test-private-token'});
  });
  it('preserves rate-limit errors and Retry-After without treating them as success', async () => {
    const response = await readAnalysisResponse(streamAnalysisResponse(async () => Response.json(
      {error:'Too many analyses.', request_id:'request_123456'},
      {status:429,headers:{'Retry-After':'60'}}),new AbortController().signal,'request_123456'));
    expect(response.ok).toBe(false);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
  });
  it('handles split UTF-8 chunks and lines', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({type:'result',status:201,body:{text:'Café'}})+'\n');
    const body = new ReadableStream({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}});
    const response=await readAnalysisResponse(new Response(body,{headers:{'Content-Type':'application/x-ndjson'}}));
    expect(await response.json()).toEqual({text:'Café'});
  });
  it.each(['{"type":"progress"}\n','not json\n','{"type":"result","status":201,"body":null}\n'])(
    'fails safely for an interrupted or invalid stream', async body => {
      await expect(readAnalysisResponse(new Response(body,{headers:{'Content-Type':'application/x-ndjson'}}))).rejects.toThrow('You have not been charged');
    });
  it('aborts pending work when the client disconnects', async () => {
    const aborted = vi.fn();
    const response=streamAnalysisResponse(signal => new Promise(resolve => {
      signal.addEventListener('abort',()=>{aborted();resolve(Response.json({error:'cancelled'},{status:503}));});
    }),new AbortController().signal,'request_123456');
    await response.body!.cancel();
    expect(aborted).toHaveBeenCalledOnce();
  });
  it('leaves ordinary JSON responses unchanged',async()=>{
    const response=Response.json({error:'Invalid PDF'},{status:422});
    expect(await readAnalysisResponse(response)).toBe(response);
  });
});
