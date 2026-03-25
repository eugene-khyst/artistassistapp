/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function htmlEncodeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export const onRequestPost: PagesFunction<Env> = async context => {
  const formData = await context.request.formData();

  const idToken = formData.get('id_token') as string | null;
  const error = formData.get('error') as string | null;
  const errorContext = formData.get('error_context') as string | null;

  let parsedErrorContext: Record<string, unknown> | null = null;
  if (errorContext) {
    try {
      parsedErrorContext = JSON.parse(errorContext) as Record<string, unknown>;
    } catch {
      // Ignore malformed error context
    }
  }

  const data = {
    idToken,
    error,
    errorContext: parsedErrorContext,
  };

  const htmlResponse: Response = await context.env.ASSETS.fetch(new URL('/', context.request.url));

  const htmlResponseWithData: Response = new HTMLRewriter()
    .on('body', {
      element: (element: Element) => {
        const encoded = htmlEncodeAttribute(JSON.stringify(data));
        element.setAttribute('data-auth-callback', encoded);
      },
    })
    .transform(htmlResponse);

  const responseHeaders = new Headers(htmlResponseWithData.headers);
  responseHeaders.delete('Content-Length');
  responseHeaders.delete('Content-Encoding');
  return new Response(htmlResponseWithData.body, {
    headers: responseHeaders,
    status: htmlResponseWithData.status === 304 ? 200 : htmlResponseWithData.status,
  });
};
