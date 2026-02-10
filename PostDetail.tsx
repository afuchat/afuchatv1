import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

const PostDetail = () => {
    const posts = useSelector((state) => state.posts);
    const scrollRef = useRef(null);

    useEffect(() => {
        // Handling scroll behavior in a more controlled way
        const handleScroll = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        };

        handleScroll(); // Scroll to the bottom initially
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [posts]);

    return (
        <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: '80vh' }}>
            {posts.map((post) => (
                <div key={post.id} className="post-detail">
                    <h2>{post.title}</h2>
                    <p>{post.content}</p>
                </div>
            ))}
        </div>
    );
};

export default PostDetail;