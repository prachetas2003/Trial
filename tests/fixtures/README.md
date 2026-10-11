The certificate and private key here are public, disposable local test fixtures.
They are used only by the temporary HTTPS server in `shield-extension.cjs`.
Chrome is configured to trust this exact certificate's SPKI for that test run;
the app, extension and downloads do not use this certificate or trust flag.

The fixture uses HTTPS because YouTube and Instagram have HSTS preloads in
Chrome. DNS test rules send those names to 127.0.0.1 so the tests contact only
the local fixture server and do not visit the real services.
