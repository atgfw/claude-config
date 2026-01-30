#!/usr/bin/env python3
"""
Scrapling Executor
Executes page actions from JSON input, used by hook automations.

Usage:
    python scrapling_executor.py --url URL --actions '[...]' [options]
    echo '{"url": "...", "actions": [...]}' | python scrapling_executor.py --stdin
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def create_page_action(actions: list[dict], output_dir: Path):
    """Create a page_action function from action list."""
    results: list[dict] = []

    def page_action(page):
        nonlocal results
        for i, step in enumerate(actions):
            action = step.get('action')
            selector = step.get('selector')
            value = step.get('value')
            filename = step.get('filename')
            attribute = step.get('attribute', 'href')
            timeout = step.get('timeout')

            try:
                if action == 'screenshot':
                    path = output_dir / (filename or f'screenshot-{i}.png')
                    page.screenshot(path=str(path))
                    results.append({'step': i, 'action': action, 'status': 'ok', 'path': str(path)})

                elif action == 'click':
                    opts = {'timeout': timeout} if timeout else {}
                    page.click(selector, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'fill':
                    opts = {'timeout': timeout} if timeout else {}
                    page.fill(selector, value, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'type':
                    opts = {'timeout': timeout} if timeout else {}
                    page.type(selector, value, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'hover':
                    opts = {'timeout': timeout} if timeout else {}
                    page.hover(selector, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'press':
                    opts = {'timeout': timeout} if timeout else {}
                    page.press(selector, value, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector, 'key': value})

                elif action == 'select':
                    opts = {'timeout': timeout} if timeout else {}
                    page.select_option(selector, value, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector, 'value': value})

                elif action == 'check':
                    opts = {'timeout': timeout} if timeout else {}
                    page.check(selector, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'uncheck':
                    opts = {'timeout': timeout} if timeout else {}
                    page.uncheck(selector, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'wait':
                    ms = int(value) if value else 1000
                    page.wait_for_timeout(ms)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'ms': ms})

                elif action == 'wait_selector':
                    opts = {'timeout': timeout} if timeout else {}
                    page.wait_for_selector(selector, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'wait_url':
                    opts = {'timeout': timeout} if timeout else {}
                    page.wait_for_url(value, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'url_pattern': value})

                elif action == 'get_text':
                    text = page.locator(selector).first.inner_text()
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector, 'text': text[:1000]})

                elif action == 'get_attribute':
                    val = page.locator(selector).first.get_attribute(attribute)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector, 'attribute': attribute, 'value': val})

                elif action == 'get_value':
                    val = page.locator(selector).first.input_value()
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector, 'value': val})

                elif action == 'list_elements':
                    elements = page.locator(selector).all()
                    texts = []
                    for el in elements[:50]:
                        try:
                            texts.append(el.inner_text()[:200].strip())
                        except Exception:
                            texts.append('[no text]')
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector, 'count': len(elements), 'texts': texts})

                elif action == 'evaluate':
                    result = page.evaluate(value)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'result': str(result)[:1000]})

                elif action == 'go_back':
                    opts = {'timeout': timeout} if timeout else {}
                    page.go_back(**opts)
                    results.append({'step': i, 'action': action, 'status': 'ok'})

                elif action == 'go_forward':
                    opts = {'timeout': timeout} if timeout else {}
                    page.go_forward(**opts)
                    results.append({'step': i, 'action': action, 'status': 'ok'})

                elif action == 'reload':
                    opts = {'timeout': timeout} if timeout else {}
                    page.reload(**opts)
                    results.append({'step': i, 'action': action, 'status': 'ok'})

                elif action == 'scroll':
                    page.locator(selector).scroll_into_view_if_needed()
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'focus':
                    opts = {'timeout': timeout} if timeout else {}
                    page.focus(selector, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'blur':
                    page.locator(selector).blur()
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector})

                elif action == 'drag':
                    opts = {'timeout': timeout} if timeout else {}
                    page.drag_and_drop(selector, value, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'source': selector, 'target': value})

                elif action == 'upload_file':
                    opts = {'timeout': timeout} if timeout else {}
                    page.set_input_files(selector, value, **opts)
                    results.append({'step': i, 'action': action, 'status': 'ok', 'selector': selector, 'file': value})

                elif action == 'get_url':
                    results.append({'step': i, 'action': action, 'status': 'ok', 'url': page.url})

                elif action == 'get_title':
                    results.append({'step': i, 'action': action, 'status': 'ok', 'title': page.title()})

                else:
                    results.append({'step': i, 'action': action, 'status': 'error', 'error': f'Unknown action: {action}'})

            except Exception as e:
                results.append({'step': i, 'action': action, 'status': 'error', 'error': str(e)})

        return results

    return page_action, lambda: results


def execute(config: dict[str, Any]) -> dict[str, Any]:
    """Execute Scrapling session from config."""
    url = config['url']
    actions = config.get('actions', [])
    method = config.get('method', 'stealthy-fetch')
    headless = config.get('headless', True)
    timeout = config.get('timeout', 45000)
    solve_cloudflare = config.get('solveCloudflare', False)
    real_chrome = config.get('realChrome', False)
    network_idle = config.get('networkIdle', True)
    output_dir = Path(config.get('outputDir', '.'))
    user_data_dir = config.get('userDataDir')

    output_dir.mkdir(parents=True, exist_ok=True)

    page_action, get_results = create_page_action(actions, output_dir)

    fetch_kwargs: dict[str, Any] = {
        'headless': headless,
        'page_action': page_action,
        'timeout': timeout,
        'network_idle': network_idle,
    }

    if real_chrome:
        fetch_kwargs['real_chrome'] = True
    if user_data_dir:
        fetch_kwargs['user_data_dir'] = user_data_dir

    if method == 'stealthy-fetch':
        from scrapling import StealthyFetcher
        if solve_cloudflare:
            fetch_kwargs['solve_cloudflare'] = True
        response = StealthyFetcher.fetch(url, **fetch_kwargs)
    elif method == 'fetch':
        from scrapling import DynamicFetcher
        response = DynamicFetcher.fetch(url, **fetch_kwargs)
    else:
        from scrapling import Fetcher
        del fetch_kwargs['page_action']
        del fetch_kwargs['network_idle']
        fetch_kwargs['timeout'] = timeout // 1000
        response = Fetcher.get(url, **fetch_kwargs)

    return {
        'url': url,
        'finalUrl': response.url if hasattr(response, 'url') else url,
        'status': response.status,
        'method': method,
        'actions': get_results(),
    }


def main():
    parser = argparse.ArgumentParser(description='Scrapling Executor for Hook Automations')
    parser.add_argument('--url', help='URL to fetch')
    parser.add_argument('--actions', help='JSON array of actions')
    parser.add_argument('--method', choices=['get', 'fetch', 'stealthy-fetch'], default='stealthy-fetch')
    parser.add_argument('--headless', action='store_true', default=True)
    parser.add_argument('--no-headless', action='store_true')
    parser.add_argument('--timeout', type=int, default=45000)
    parser.add_argument('--solve-cloudflare', action='store_true')
    parser.add_argument('--real-chrome', action='store_true')
    parser.add_argument('--network-idle', action='store_true', default=True)
    parser.add_argument('--output-dir', default='.')
    parser.add_argument('--user-data-dir')
    parser.add_argument('--stdin', action='store_true', help='Read config from stdin as JSON')
    parser.add_argument('--config', help='Path to JSON config file')

    args = parser.parse_args()

    if args.stdin:
        config = json.load(sys.stdin)
    elif args.config:
        with open(args.config) as f:
            config = json.load(f)
    elif args.url:
        config = {
            'url': args.url,
            'actions': json.loads(args.actions) if args.actions else [],
            'method': args.method,
            'headless': not args.no_headless,
            'timeout': args.timeout,
            'solveCloudflare': args.solve_cloudflare,
            'realChrome': args.real_chrome,
            'networkIdle': args.network_idle,
            'outputDir': args.output_dir,
            'userDataDir': args.user_data_dir,
        }
    else:
        parser.print_help()
        sys.exit(1)

    try:
        result = execute(config)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error': str(e)}, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
