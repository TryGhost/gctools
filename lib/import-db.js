import {join, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import fs from 'fs-extra';
import Database from 'better-sqlite3';

/**
 * Get a hash of the API URL for use in the database filename
 * @param {string} apiURL - The Ghost API URL
 * @returns {string} - A short hash of the URL
 */
const getUrlHash = (apiURL) => {
    return createHash('md5').update(apiURL).digest('hex').slice(0, 12);
};

/**
 * Open or create a persistent SQLite database for caching Ghost content
 * @param {string} apiURL - The Ghost API URL (used to create unique db per site)
 * @param {string} jsonFile - Path to the JSON import file (db stored in same folder)
 * @returns {Database} - The SQLite database instance
 */
const openDatabase = (apiURL, jsonFile) => {
    const jsonDir = dirname(jsonFile);
    const urlHash = getUrlHash(apiURL);
    const dbPath = join(jsonDir, `import-cache-${urlHash}.db`);

    const db = new Database(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');

    // Create tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE,
            title TEXT,
            type TEXT
        );
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE,
            name TEXT
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE,
            email TEXT,
            name TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
        CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
        CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

        CREATE TABLE IF NOT EXISTS imported_slugs (
            slug TEXT PRIMARY KEY,
            imported_at TEXT
        );
    `);

    return db;
};

/**
 * Refresh the cache by fetching all posts, tags, and users from the Ghost API
 * @param {Database} db - The SQLite database instance
 * @param {GhostAdminAPI} api - The Ghost Admin API client
 * @param {Function} discover - The discover function for batch fetching
 * @param {Object} options - Options for the refresh
 * @returns {Object} - Counts of items cached
 */
const refreshCache = async (db, api, discover, options = {}) => {
    const counts = {posts: 0, tags: 0, users: 0};

    // Fetch and cache posts
    const posts = await discover({
        api,
        type: 'posts',
        limit: 100,
        fields: 'id,slug,title,type',
        progress: options.verbose
    });

    const upsertPost = db.prepare(`
        INSERT INTO posts (id, slug, title, type) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, type = excluded.type
    `);

    const insertPosts = db.transaction((postList) => {
        for (const post of postList) {
            upsertPost.run(post.id, post.slug, post.title, post.type || 'post');
        }
    });
    insertPosts(posts);
    counts.posts = posts.length;

    // Fetch and cache pages
    const pages = await discover({
        api,
        type: 'pages',
        limit: 100,
        fields: 'id,slug,title',
        progress: options.verbose
    });

    const insertPages = db.transaction((pageList) => {
        for (const page of pageList) {
            upsertPost.run(page.id, page.slug, page.title, 'page');
        }
    });
    insertPages(pages);
    counts.posts += pages.length;

    // Fetch and cache tags
    const tags = await discover({
        api,
        type: 'tags',
        limit: 100,
        fields: 'id,slug,name',
        progress: options.verbose
    });

    const upsertTag = db.prepare(`
        INSERT INTO tags (id, slug, name) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name
    `);

    const insertTags = db.transaction((tagList) => {
        for (const tag of tagList) {
            upsertTag.run(tag.id, tag.slug, tag.name);
        }
    });
    insertTags(tags);
    counts.tags = tags.length;

    // Fetch and cache users
    const users = await discover({
        api,
        type: 'users',
        limit: 100,
        fields: 'id,slug,email,name',
        progress: options.verbose
    });

    const upsertUser = db.prepare(`
        INSERT INTO users (id, slug, email, name) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, email = excluded.email, name = excluded.name
    `);

    const insertUsers = db.transaction((userList) => {
        for (const user of userList) {
            upsertUser.run(user.id, user.slug, user.email, user.name);
        }
    });
    insertUsers(users);
    counts.users = users.length;

    return counts;
};

/**
 * Check if a post exists by slug
 * @param {Database} db - The SQLite database instance
 * @param {string} slug - The post slug to check
 * @returns {boolean} - True if the post exists
 */
const postExistsBySlug = (db, slug) => {
    const stmt = db.prepare('SELECT 1 FROM posts WHERE slug = ?');
    return stmt.get(slug) !== undefined;
};

/**
 * Find a tag by slug
 * @param {Database} db - The SQLite database instance
 * @param {string} slug - The tag slug to find
 * @returns {Object|null} - The tag object or null if not found
 */
const findTagBySlug = (db, slug) => {
    const stmt = db.prepare('SELECT id, slug, name FROM tags WHERE slug = ?');
    return stmt.get(slug) || null;
};

/**
 * Find a user by slug
 * @param {Database} db - The SQLite database instance
 * @param {string} slug - The user slug to find
 * @returns {Object|null} - The user object or null if not found
 */
const findUserBySlug = (db, slug) => {
    const stmt = db.prepare('SELECT id, slug, email, name FROM users WHERE slug = ?');
    return stmt.get(slug) || null;
};

/**
 * Find a user by email
 * @param {Database} db - The SQLite database instance
 * @param {string} email - The user email to find
 * @returns {Object|null} - The user object or null if not found
 */
const findUserByEmail = (db, email) => {
    const stmt = db.prepare('SELECT id, slug, email, name FROM users WHERE email = ?');
    return stmt.get(email) || null;
};

/**
 * Add a newly imported post to the cache
 * @param {Database} db - The SQLite database instance
 * @param {Object} post - The post object to add
 */
const addPost = (db, post) => {
    const stmt = db.prepare(`
        INSERT INTO posts (id, slug, title, type) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, type = excluded.type
    `);
    stmt.run(post.id, post.slug, post.title, post.type || 'post');
};

/**
 * Check if a slug has already been imported from a JSON file
 * @param {Database} db - The SQLite database instance
 * @param {string} slug - The original JSON slug to check
 * @returns {boolean} - True if already imported
 */
const wasSlugImported = (db, slug) => {
    const stmt = db.prepare('SELECT 1 FROM imported_slugs WHERE slug = ?');
    return stmt.get(slug) !== undefined;
};

/**
 * Record that a slug was imported from a JSON file
 * @param {Database} db - The SQLite database instance
 * @param {string} slug - The original JSON slug that was imported
 */
const markSlugImported = (db, slug) => {
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO imported_slugs (slug, imported_at) VALUES (?, ?)
    `);
    stmt.run(slug, new Date().toISOString());
};

/**
 * Close the database connection
 * @param {Database} db - The SQLite database instance
 */
const closeDatabase = (db) => {
    if (db) {
        db.close();
    }
};

export {
    openDatabase,
    refreshCache,
    postExistsBySlug,
    findTagBySlug,
    findUserBySlug,
    findUserByEmail,
    addPost,
    wasSlugImported,
    markSlugImported,
    closeDatabase
};
