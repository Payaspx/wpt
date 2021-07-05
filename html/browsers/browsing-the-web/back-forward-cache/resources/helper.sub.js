const idThis = token();

const originSameOrigin =
  location.protocol === 'http:' ?
  'http://{{host}}:{{ports[http][0]}}' :
  'https://{{host}}:{{ports[https][0]}}';
const originSameSite =
  location.protocol === 'http:' ?
  'http://{{host}}:{{ports[http][1]}}' :
  'https://{{host}}:{{ports[https][1]}}';
const originCrossSite =
  location.protocol === 'http:' ?
  'http://{{hosts[alt][www]}}:{{ports[http][0]}}' :
  'https://{{hosts[alt][www]}}:{{ports[https][0]}}';

const executorPath =
  '/html/browsers/browsing-the-web/back-forward-cache/resources/executor.html?uuid=';
const backPath =
  '/html/browsers/browsing-the-web/back-forward-cache/resources/back.html';

async function evalOn(id_target, expr) {
  await send(id_target, `await send('${idThis}', JSON.stringify(${expr}));`);
  const result = await receive(idThis);
  return JSON.parse(result);
}

async function asyncEvalOn(id_target, expr) {
  send(id_target, `
    try {
      const result = await async function() { ${expr} }();
      await send('${idThis}', JSON.stringify(result));
    }
    catch (error) {
      await send('${idThis}', '"Error"');
    }`);
  const result = await receive(idThis);
  return JSON.parse(result);
}

async function runEligibilityCheck(script) {
  const idA = token();
  window.open(executorPath + idA, '_blank', 'noopener');
  await send(idA, script);
  await send(idA, `
      prepareNavigation();
      location.href = '${originCrossSite + backPath}';
  `);
  await assert_bfcached(idA);
}

async function getBFCachedStatus(id_target) {
  const [loadCount, isBFCached] =
    await evalOn(id_target, '[window.loadCount, window.isBFCached]');
  if (loadCount === 1 && isBFCached === true) {
    return 'BFCached';
  } else if (loadCount === 2 && isBFCached === false) {
    return 'Not BFCached';
  } else {
    assert_unreached(`Got unexpected BFCache status: loadCount = ${loadCount}, isBFCached = ${isBFCached}`);
  }
}

async function assert_bfcached(id_target) {
  const status = await getBFCachedStatus(id_target);
  assert_implements_optional(
    status === 'BFCached',
    'Should be BFCached');
}

async function assert_not_bfcached(id_target) {
  const status = await getBFCachedStatus(id_target);
  assert_implements_optional(
    status !== 'BFCached',
    'Should not be BFCached');
}
