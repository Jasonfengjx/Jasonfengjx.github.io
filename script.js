// ==================== 数据管理模块 ====================
class BlogDatabase {
    constructor() {
        this.storageKey = 'blogs';
        this.commentsKey = 'comments';
        this.contactsKey = 'contacts';
        this.initDefaultData();
    }

    // 初始化默认数据
    async initDefaultData() {
        if (!localStorage.getItem(this.storageKey)) {
            try {
                const response = await fetch('posts/metadata.json');
                const defaultBlogs = await response.json();
                this.setBlogs(defaultBlogs);
                // 重新派发事件通知数据已加载
                window.dispatchEvent(new Event('blogsLoaded'));
            } catch (error) {
                console.error('Failed to load blog metadata:', error);
            }
        } else {
             window.dispatchEvent(new Event('blogsLoaded'));
        }
    }

    // 获取所有博客
    getBlogs() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    // 保存博客列表
    setBlogs(blogs) {
        localStorage.setItem(this.storageKey, JSON.stringify(blogs));
    }

    // 根据ID获取单个博客，如果内容不存在则加载内容
    async getBlogById(id) {
        const blogs = this.getBlogs();
        const blog = blogs.find(blog => blog.id === parseInt(id));
        
        if (blog && !blog.content && blog.contentPath) {
             try {
                const response = await fetch(blog.contentPath);
                const data = await response.json();
                blog.content = data.content;
                // 更新localStorage中的缓存（可选，或者每次都重新获取）
                // 这里选择不更新localStorage的content，以保持元数据轻量，
                // 仅返回带有content的对象
                return blog;
            } catch (error) {
                console.error('Failed to load blog content:', error);
                return blog;
            }
        }
        return blog;
    }

    // 获取评论
    getComments(blogId) {
        const data = localStorage.getItem(`${this.commentsKey}_${blogId}`);
        return data ? JSON.parse(data) : [];
    }

    // 添加评论
    addComment(blogId, comment) {
        const comments = this.getComments(blogId);
        const newComment = {
            id: comments.length + 1,
            ...comment,
            date: new Date().toLocaleDateString('zh-CN')
        };
        comments.push(newComment);
        localStorage.setItem(`${this.commentsKey}_${blogId}`, JSON.stringify(comments));
        return newComment;
    }

    // 保存联系表单
    saveContact(contact) {
        const contacts = this.getContacts();
        const newContact = {
            id: contacts.length + 1,
            ...contact,
            date: new Date().toLocaleDateString('zh-CN'),
            time: new Date().toLocaleTimeString('zh-CN')
        };
        contacts.push(newContact);
        localStorage.setItem(this.contactsKey, JSON.stringify(contacts));
        return newContact;
    }

    // 获取所有联系信息
    getContacts() {
        const data = localStorage.getItem(this.contactsKey);
        return data ? JSON.parse(data) : [];
    }
}

// ==================== 应用程序主类 ====================
class BlogApp {
    constructor() {
        this.db = new BlogDatabase();
        this.currentPage = 'home';
        this.currentBlogId = null;
        this.init();
    }

    // 初始化应用
    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.loadPage('home');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 导航链接
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.loadPage(page);
            });
        });

        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 哈希路由
        window.addEventListener('hashchange', () => {
            this.handleRouting();
        });

        // 搜索和筛选
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterBlogs();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterBlogs();
        });

        // 评论表单
        document.getElementById('commentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComment();
        });

        // 返回按钮
        if (document.getElementById('backBtn')) {
            document.getElementById('backBtn').addEventListener('click', () => {
                this.loadPage('home');
            });
        }

        // 联系表单
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitContact();
        });
    }

    // 加载页面
    async loadPage(page) {
        // 确保数据已加载
        if (!this.db.getBlogs().length) {
            await new Promise(resolve => {
                const handler = () => {
                   window.removeEventListener('blogsLoaded', handler);
                   resolve();
               };
                if (this.db.getBlogs().length) {
                    resolve();
                } else {
                    window.addEventListener('blogsLoaded', handler);
                }
            });
        }

        // 移除所有活跃类
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

        // 添加活跃类
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }

        // 更新导航活跃状态
        const navLink = document.querySelector(`[data-page="${page}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }

        this.currentPage = page;

        // 加载页面特定内容
        if (page === 'home') {
            this.loadBlogList();
        } else if (page === 'essays') {
            this.loadCategoryList('随笔', 'essaysList');
        } else if (page === 'engineering') {
            this.loadCategoryList('工程', 'engineeringList');
        } else if (page === 'research') {
            this.loadCategoryList('科研', 'researchList');
        }

        window.location.hash = `#/${page === 'home' ? '' : page}`;
    }

    // 加载分类列表
    loadCategoryList(category, elementId) {
        const blogs = this.db.getBlogs().filter(blog => blog.category === category);
        const container = document.getElementById(elementId);
        container.innerHTML = '';

        if (blogs.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">暂无内容</p>';
            return;
        }

        blogs.forEach(blog => {
            const card = this.createBlogCard(blog);
            container.appendChild(card);
        });
    }

    // 加载博客列表
    loadBlogList() {
        const blogs = this.db.getBlogs();
        const blogList = document.getElementById('blogList');
        blogList.innerHTML = '';

        blogs.forEach(blog => {
            const card = this.createBlogCard(blog);
            blogList.appendChild(card);
        });
    }

    // 创建博客卡片
    createBlogCard(blog) {
        const card = document.createElement('div');
        card.className = 'blog-card';
        card.innerHTML = `
            <div class="blog-card-image">📰</div>
            <div class="blog-card-content">
                <h3 class="blog-card-title">${this.escapeHtml(blog.title)}</h3>
                <span class="blog-card-category">${blog.category}</span>
                <p class="blog-card-excerpt">${this.escapeHtml(blog.excerpt)}</p>
                <div class="blog-card-meta">
                    <span>📅 ${blog.date}</span>
                    <span>⏱️ ${blog.readTime}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            this.loadBlogDetail(blog.id);
        });
        return card;
    }

    // 加载博客详情
    async loadBlogDetail(blogId) {
        const blog = await this.db.getBlogById(blogId);
        if (!blog) return;

        this.currentBlogId = blogId;

        // 显示详情页
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('detail-page').classList.add('active');

        // 更新导航
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

        // 填充详情内容
        const detailContainer = document.getElementById('blogDetail');
        detailContainer.innerHTML = `
            <h1>${this.escapeHtml(blog.title)}</h1>
            <div class="blog-detail-meta">
                <span>✍️ 作者: ${blog.author}</span>
                <span>📅 ${blog.date}</span>
                <span>⏱️ ${blog.readTime}</span>
                <span>🏷️ ${blog.category}</span>
            </div>
            <div class="blog-detail-content">
                ${this.renderContent(blog.content)}
            </div>
        `;

        // 清空评论表单
        document.getElementById('commentForm').reset();

        // 加载评论
        this.loadComments(blogId);

        window.location.hash = `#/blog/${blogId}`;
    }

    // 加载评论
    loadComments(blogId) {
        const comments = this.db.getComments(blogId);
        const commentsList = document.getElementById('commentsList');
        const commentCount = document.getElementById('commentCount');

        commentCount.textContent = comments.length;

        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无评论，成为第一个评论者吧！</p>';
            return;
        }

        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            item.innerHTML = `
                <div class="comment-author">${this.escapeHtml(comment.name)}</div>
                <div class="comment-time">${comment.date}</div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            `;
            commentsList.appendChild(item);
        });
    }

    // 提交评论
    submitComment() {
        const name = document.getElementById('commenterName').value.trim();
        const text = document.getElementById('commentText').value.trim();

        if (!name || !text) {
            this.showToast('请填写所有字段', 'error');
            return;
        }

        try {
            this.db.addComment(this.currentBlogId, { name, text });
            document.getElementById('commentForm').reset();
            this.loadComments(this.currentBlogId);
            this.showToast('评论已发表！', 'success');
        } catch (error) {
            console.error('评论提交失败:', error);
            this.showToast('评论提交失败，请重试', 'error');
        }
    }

    // 提交联系表单
    submitContact() {
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const subject = document.getElementById('contactSubject').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !subject || !message) {
            this.showToast('请填写所有字段', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showToast('请输入有效的邮箱地址', 'error');
            return;
        }

        try {
            this.db.saveContact({ name, email, subject, message });
            document.getElementById('contactForm').reset();
            this.showToast('消息已发送！感谢您的联系。', 'success');
        } catch (error) {
            console.error('提交失败:', error);
            this.showToast('提交失败，请重试', 'error');
        }
    }

    // 筛选博客
    filterBlogs() {
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const selectedCategory = document.getElementById('categoryFilter').value;
        const blogs = this.db.getBlogs();

        const filtered = blogs.filter(blog => {
            const matchesSearch = blog.title.toLowerCase().includes(searchQuery) ||
                                blog.excerpt.toLowerCase().includes(searchQuery) ||
                                blog.content.toLowerCase().includes(searchQuery);
            const matchesCategory = !selectedCategory || blog.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        const blogList = document.getElementById('blogList');
        blogList.innerHTML = '';

        if (filtered.length === 0) {
            blogList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">没有找到匹配的博客</p>';
            return;
        }

        filtered.forEach(blog => {
            const card = this.createBlogCard(blog);
            blogList.appendChild(card);
        });
    }

    // 主题切换
    toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        this.updateThemeIcon();
    }

    // 加载主题设置
    loadTheme() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
        this.updateThemeIcon();
    }

    // 更新主题图标
    updateThemeIcon() {
        const icon = document.querySelector('.theme-icon');
        const isDarkMode = document.body.classList.contains('dark-mode');
        icon.textContent = isDarkMode ? '☀️' : '🌙';
    }

    // 处理路由
    handleRouting() {
        const hash = window.location.hash.slice(2);
        if (hash.startsWith('blog/')) {
            const blogId = hash.split('/')[1];
            this.loadBlogDetail(blogId);
        } else if (hash === '' || hash === '/') {
            this.loadPage('home');
        } else {
            this.loadPage(hash);
        }
    }

    // 显示提示信息
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // HTML转义（防止XSS）
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    // 渲染内容（由于支持简单Markdown语法）
    renderContent(content) {
        if (!content) return '<p>内容加载中...</p>';
        
        let safeContent = this.escapeHtml(content);

        // 1. 解析图片语法 ![alt](url)
        safeContent = safeContent.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
            return `<img src="${url}" alt="${alt}" class="blog-content-img" loading="lazy">`;
        });

        // 2. 解析换行符为段落
        // 将连续的换行符视为段落分隔
        return safeContent.split('\n').map(line => {
            line = line.trim();
            if (!line) return '';
            // 如果该行已经是简单的HTML标签（比如刚才替换的img），则不包裹p
            if (line.startsWith('<img') && line.endsWith('>')) {
                return `<div class="blog-img-wrapper">${line}</div>`;
            }
            return `<p>${line}</p>`;
        }).join('');
    }

    // 验证邮箱
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// ==================== 初始化应用 ====================
document.addEventListener('DOMContentLoaded', () => {
    new BlogApp();
});
