/* eslint-env mocha */
const Promise = require('bluebird')
const expect = require('chai').expect
const path = require('path')
const getPackageInfo = require('../src/index')
const readFile = Promise.promisify(require('fs').readFile)

// Test to see if given source actually represents the source
const testSource = (prop, source) => {
  return readFile(source.src, 'utf-8')
  .then(JSON.parse)
  .then((pkg) => expect(pkg).to.deep.equal(source.pkg))
}

describe('get-package-info', () => {
  it('should reject promise for non-array non-string props', (done) => {
    getPackageInfo(
      {},
      path.join(__dirname, 'node_modules/we/need/to/go/deeper/')
    )
    .catch(() => {
      done()
    })
  })

  it('should return an empty result', () => {
    return getPackageInfo(
      [],
      path.join(__dirname, 'node_modules/we/need/to/go/deeper/')
    )
    .then((result) => {
      expect(result.values).to.deep.equal({})
      expect(result.source).to.deep.equal({})
    })
  })

  it('should return the right properties', () => {
    return getPackageInfo(
      [
        ['productName', 'name'],
        'version',
        'dependencies.some-dependency',
        'devDependencies.some-dev-dependency'
      ],
      path.join(__dirname, 'node_modules/we/need/to/go/deeper/')
    )
    .then((result) => {
      expect(result.values).to.deep.equal({
        productName: 'Deeper',
        name: 'Deeper',
        version: '1.2.3',
        'dependencies.some-dependency': '~1.2.3',
        'devDependencies.some-dev-dependency': '~1.2.3'
      })

      return Promise.all(Object.keys(result.source).map(
          (prop) => testSource(prop, result.source[prop])
      ))
    })
  })

  it('should return the right properties to a given callback', (done) => {
    getPackageInfo(
      [
        ['productName', 'name'],
        'version',
        'dependencies.some-dependency',
        'devDependencies.some-dev-dependency'
      ],
      path.join(__dirname, 'node_modules/we/need/to/go/deeper/'),
      (err, result) => {
        expect(err).to.be.null
        expect(result.values).to.deep.equal({
          productName: 'Deeper',
          name: 'Deeper',
          version: '1.2.3',
          'dependencies.some-dependency': '~1.2.3',
          'devDependencies.some-dev-dependency': '~1.2.3'
        })
        // Test source prop points to the prop the value came from
        expect(result.source['productName'].prop).to.equal('productName')
        expect(result.source['name'].prop).to.equal('productName')
        expect(result.source['version'].prop).to.equal('version')

        Promise.all(Object.keys(result.source).map(
          (prop) => testSource(prop, result.source[prop])
        ))
        .then(() => done())
      }
    )
  })

  it('should resolve with error message when unable to find all props', () => {
    return getPackageInfo(
      [
        ['productName', 'name'],
        'nonexistent',
        'version',
        ['this', 'doesntexist']
      ],
      path.join(__dirname, 'node_modules/we/need/to/go/deeper/')
    )
    .then(() => {
      throw new Error('Should not resolve when props are missing')
    })
    .catch((err) => {
      expect(err.missingProps).to.deep.equal(['nonexistent', ['this', 'doesntexist']])

      return Promise.all(Object.keys(err.result.source).map(
        (prop) => testSource(prop, err.result.source[prop])
      ))
    })
  })
})
