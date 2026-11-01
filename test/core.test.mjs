import test from 'node:test';
import assert from 'node:assert/strict';
import {centerCropLossPercent,formatBytes,photoExportPlan,sanitizeFilename} from '../core.mjs';

test('fits a landscape source into a square without cropping',()=>{
  const plan=photoExportPlan(1280,960,'square',1000,10,false);
  assert.equal(plan.width,1000);assert.equal(plan.height,1000);
  assert.equal(Math.round(plan.drawWidth),800);assert.equal(Math.round(plan.drawHeight),600);
  assert.equal(Math.round(plan.x),100);assert.equal(Math.round(plan.y),200);
});

test('reports geometric crop loss for a 4:5 target',()=>{
  assert.equal(centerCropLossPercent(1280,960,'four-five').toFixed(1),'40.0');
});

test('does not enlarge unless requested',()=>{
  const noEnlarge=photoExportPlan(400,300,'square',1000,0,false);
  const enlarge=photoExportPlan(400,300,'square',1000,0,true);
  assert.equal(noEnlarge.scale,1);assert.equal(enlarge.scale,2.5);
});

test('rejects invalid export values',()=>{
  assert.throws(()=>photoExportPlan(1280,960,'square',10,0));
  assert.throws(()=>photoExportPlan(1280,960,'unknown',1000,0));
});

test('formats names and bytes safely',()=>{
  assert.equal(formatBytes(1024*1024),'1.00 MiB');
  assert.equal(sanitizeFilename('a<>:photo.png'),'a---photo');
});
