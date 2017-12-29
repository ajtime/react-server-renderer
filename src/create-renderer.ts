import { ReactElement } from 'react'
import { renderToNodeStream, renderToString } from 'react-dom/server'

import TemplateRenderer, { TemplateRendererOptions } from './template-renderer'
import { UserContext, createPromiseCallback } from './util'

export type RenderOptions = TemplateRendererOptions & {
  basedir?: string
  runInNewContext?: false | 'once'
}

export interface Renderer {
  renderToString?: (
    component: ReactElement<any>,
    context: UserContext,
    cb: any,
  ) => Promise<string>
  renderToStream: (
    component: ReactElement<any>,
    context: UserContext,
  ) => NodeJS.ReadableStream
}

export function createRenderer(
  options: TemplateRendererOptions = {},
): Renderer {
  const templateRenderer = new TemplateRenderer(options)

  return {
    renderToString(
      component: ReactElement<any>,
      context: UserContext,
      cb: any,
    ): Promise<string> {
      if (typeof context === 'function') {
        cb = context
        context = {}
      }
      if (context) {
        templateRenderer.bindRenderFns(context)
      }

      // no callback, return Promise
      let promise

      if (!cb) {
        ;({ promise, cb } = createPromiseCallback())
      }

      let result

      try {
        result = renderToString(component)

        if (options.template) {
          result = templateRenderer.renderSync(result, context)
        }
        cb(null, result)
      } catch (e) {
        cb(e)
      }

      return promise
    },

    renderToStream(
      component: ReactElement<any>,
      context?: UserContext,
    ): NodeJS.ReadableStream {
      if (context) {
        templateRenderer.bindRenderFns(context)
      }

      const renderStream = renderToNodeStream(component)

      if (!options.template) {
        return renderStream
      }

      const templateStream = templateRenderer.createStream(context)
      renderStream.on('error', err => templateStream.emit('error', err))
      renderStream.pipe(templateStream)
      return templateStream
    },
  }
}