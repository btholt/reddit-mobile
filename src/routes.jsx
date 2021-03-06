// This file maps url routes to React element changes.

import q from 'q';
import { stringify } from 'querystring';
import React from 'react';

// Load models from snoode (api lib) so we can post new ones.
import { models } from 'snoode';

// Load up the main react elements. Because of the way we define mutators, we
// need to use factories that take an app instance (with registered mutators)
// instead of requiring the elements directly. Womp womp
import IndexPageFactory from './views/pages/index';
var IndexPage;

import ListingPageFactory from './views/pages/listing';
var ListingPage;

import UserProfilePageFactory from './views/pages/userProfile';
var UserProfilePage;

import UserGildPageFactory from './views/pages/userGild';
var UserGildPage;

import UserActivityPageFactory from './views/pages/userActivity';
var UserActivityPage;

import NotFoundPageFactory from './views/pages/404';
var NotFoundPage;

import ClientErrorPageFactory from './views/pages/400';
var ClientErrorPage;

import ServerErrorPageFactory from './views/pages/500';
var ServerErrorPage;

import LayoutFactory from './views/layouts/DefaultLayout';
var Layout;

import BodyLayoutFactory from './views/layouts/BodyLayout';
var BodyLayout;

function wrap(fn, ctx, ...args) {
  return new Promise(function(resolve, reject) {
    fn.apply(ctx, args).then(resolve, reject);
  });
}

// The main entry point to this file is the routes function. It will call the
// React factories to get at the mutated react elements, and map routes.
function routes(app) {
  IndexPage = IndexPageFactory(app);
  ListingPage = ListingPageFactory(app);
  UserProfilePage = UserProfilePageFactory(app);
  UserGildPage = UserGildPageFactory(app);
  UserActivityPage = UserActivityPageFactory(app);
  NotFoundPage = NotFoundPageFactory(app);
  ClientErrorPage = ClientErrorPageFactory(app);
  ServerErrorPage = ServerErrorPageFactory(app);
  Layout = LayoutFactory(app);
  BodyLayout = BodyLayoutFactory(app);

  // Build all the standard properties used to render layouts. This may move
  // higher up (into reddit-mobile) at some point.
  function buildProps(ctx, props) {
    var defaultProps = {
      title: 'reddit: the front page of the internet',
      liveReload: app.getConfig('liveReload') === 'true',
      env: app.getConfig('env'),
      minifyAssets: app.getConfig('minifyAssets'),
      manifest: app.getConfig('manifest'),
      assetPath: app.getConfig('assetPath'),
      user: ctx.user,
      token: ctx.token,
      csrf: ctx.csrf,
      query: ctx.query,
      params: ctx.params,
      api: app.V1Api(ctx.token),
      url: ctx.url,
    };

    return Object.assign({}, defaultProps, ctx.props, props);
  }

  app.router.get('/health', function * () {
    this.body = 'OK';
  });

  function * indexPage (next) {
    var page;
    var sort = this.query.sort || 'hot';
    var ctx = this;

    var props = buildProps(ctx, {
      subredditName: ctx.params.subreddit,
      after: ctx.query.after,
      before: ctx.query.before,
      page: parseInt(ctx.query.page) || 0,
      sort: sort,
    });

    var data = yield wrap(IndexPage.populateData, this, props.api, props, this.renderSynchronous, this.useCache);

    props = Object.assign({}, data, props);

    try {
      var key = 'index-' + (this.params.subreddit || '') + stringify(this.query);
      page = (
        <BodyLayout {...props} app={app}>
          <IndexPage {...props} key={ key } app={app}/>
        </BodyLayout>
      );
    } catch (e) {
      return app.error(e, this, next);
    }

    this.body = page;
    this.layout = Layout;
    this.props = props;
  }

  // The homepage route.
  app.router.get('/', indexPage);
  app.router.get('/r/:subreddit', indexPage);

  app.router.get('/r/:subreddit/comments/:listingId/:listingTitle/:commentId?', function *(next) {
    var page;
    var ctx = this;

    var props = buildProps(this, {
      subredditName: ctx.params.subreddit,
      sort: ctx.query.sort,
    });

    props.listingId = this.params.listingId;

    var data = yield ListingPage.populateData(props.api, props, this.renderSynchronous, this.useCache);

    props = Object.assign({}, data, props);
    props.app = app;

    var key = `listing-${props.listingId}-${stringify(this.query)}`;

    try {
      page = (
        <BodyLayout {...props} app={app}>
          <ListingPage {...props} key={ key } app={app} />
        </BodyLayout>
      );
    } catch (e) {
      return app.error(e, this, next);
    }

    this.body = page;
    this.layout = Layout;
    this.props = props;
  });

  app.router.get('/u/:user', function *(next) {
    var page;
    var ctx = this;

    var props = buildProps(this, {
      userName: ctx.params.user,
    });

    var data = yield UserProfilePage.populateData(props.api, props, this.renderSynchronous, this.useCache);

    props = Object.assign({}, data, props);
    props.app = app;

    var key = `user-profile-${ctx.params.user}`;

    try {
      page = (
        <BodyLayout {...props} app={app}>
          <UserProfilePage {...props} key={ key } app={app} />
        </BodyLayout>
      );
    } catch (e) {
      return app.error(e, this, next);
    }

    this.body = page;
    this.layout = Layout;
    this.props = props;
  });

  app.router.get('/u/:user/gild', function *(next) {
    var page;
    var ctx = this;

    var props = buildProps(this, {
      userName: ctx.params.user,
    });

    var data = yield UserGildPage.populateData(props.api, props, this.renderSynchronous, this.useCache);

    props = Object.assign({}, data, props);
    props.app = app;

    var key = `user-gild-${ctx.params.user}`;

    try {
      page = (
        <BodyLayout {...props} app={app}>
          <UserGildPage {...props} key={ key } app={app} />
        </BodyLayout>
      );
    } catch (e) {
      return app.error(e, this, next);
    }

    this.body = page;
    this.layout = Layout;
    this.props = props;
  });

  app.router.get('/u/:user/activity', function *(next) {
    var page;
    var sort = this.query.sort || 'hot';
    var activity = this.query.activity || 'comments';

    var ctx = this;

    var props = buildProps(ctx, {
      activity: activity,
      userName: ctx.params.user,
      after: ctx.query.after,
      before: ctx.query.before,
      page: parseInt(ctx.query.page) || 0,
      user: ctx.params.user,
      sort: sort,
    });

    var data = yield wrap(UserActivityPage.populateData, this, props.api, props, this.renderSynchronous, this.useCache);

    props = Object.assign({}, data, props);

    try {
      var key = 'index-' + (this.params.subreddit || '') + stringify(this.query);
      page = (
        <BodyLayout {...props} app={app}>
          <UserActivityPage {...props} key={ key } app={app}/>
        </BodyLayout>
      );
    } catch (e) {
      return app.error(e, this, next);
    }

    this.body = page;
    this.layout = Layout;
    this.props = props;
  });

  app.router.get('/404', function * () {
    var ctx = this;

    var props = buildProps(this, {
      referrer: ctx.headers.referer,
    });

    var page = (
      <BodyLayout {...props} app={app}>
        <NotFoundPage {...props}/>
      </BodyLayout>
    );

    this.body = page;
    this.layout = Layout;
    this.props = props;
  });

  app.router.get(/\/4\d\d/, function * () {
    var ctx = this;

    var props = buildProps(this, {
      referrer: ctx.headers.referer,
    });

    try {
      var page = (
        <BodyLayout {...props} app={app}>
          <ClientErrorPage {...props}/>
        </BodyLayout>
      );
    } catch (e) {
      return app.error(e, this, next);
    }

    this.body = page;
    this.layout = Layout;
    this.props = props;
  });

  app.router.get(/\/5\d\d/, function * () {
    var ctx = this;

    var props = buildProps(this, {
      referrer: ctx.headers.referer,
    });

    if (app.getConfig('debug')) {
      props.error = ctx.error;
    }

    try {
      var page = (
        <BodyLayout {...props} app={app}>
          <ServerErrorPage {...props}/>
        </BodyLayout>
      );
    } catch (e) {
      return app.error(e, this, next);
    }

    this.body = page;
    this.layout = Layout;
    this.props = props;
  });

  // Server-side only!
  app.router.all('vote', '/vote/:id',
    function * () {
      var endpoints = {
        '1': 'comment',
        '3': 'listing',
      }

      var id = this.params.id;
      var endpoint = endpoints[id[1]];

      if (!(this.access_token)) {
        this.redirect(this.headers.referer || '/');
      }

      var vote = new models.Vote({
        direction: parseInt(this.query.direction),
        id: id,
      });

      if (vote.get('direction') !== undefined && vote.get('id')) {
        var api = app.V1Api(props.token);

        var options = api.buildOptions(this.token);

        options = Object.assign(options, {
          model: vote,
        });

        api.votes.post(options).done(function() {
          this.redirect(this.headers.referer || '/');
        });
      } else {
        this.redirect(this.headers.referer || '/');
      }
    });

  app.router.post('/comment', function * () {
    var ctx = this;

    var comment = new models.Comment({
      thingId: ctx.body.thingId,
      text: ctx.body.text
    });

    var api = app.V1Api(props.token);

    if (!this.token) {
      return this.redirect(this.headers.referer || '/');
    }

    var options = api.buildOptions(this.session.token.access_token);

    options = Object.assign(options, {
      model: comment,
    });

    api.comments.post(options).done(function() {
      this.redirect(this.headers.referer || '/');
    });
  });
}

export default routes;
