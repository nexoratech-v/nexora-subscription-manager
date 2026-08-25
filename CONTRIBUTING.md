# Contributing

Thanks for your interest in improving this project.

## Before you start

Run the test suite to make sure your environment works:

```bash
npm install jsdom
node test-subpage.js
```

You should see `20/21 tests passed`. The one "failure" is an expected 404 from
the live-data endpoint, which only exists on a real 3x-ui server.

## Making changes

1. Fork the repo and create a branch
2. Make your change
3. **Run the tests again** — this project touches production systems, so an
   untested change can break real customers' subscription pages
4. Open a pull request describing what changed and why

## Testing the template

The subscription page is a Go `html/template`. If you modify it, verify it still
renders correctly before submitting:

- Template variables must match the [official 3x-ui list](https://github.com/MHSanaei/3x-ui/blob/main/docs/custom-subscription-templates.md)
- `{{` and `}}` must stay balanced
- Never reference a DOM element without a null check — a single
  `Cannot set properties of null` stops the entire script

## Reporting bugs

Please include:
- Your OS and 3x-ui version
- Output of `nexora diagnose`
- Browser console errors (F12 → Console)
