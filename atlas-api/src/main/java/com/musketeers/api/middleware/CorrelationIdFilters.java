package com.musketeers.api.middleware;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import org.jboss.logging.MDC;
import org.jboss.resteasy.reactive.server.ServerRequestFilter;
import org.jboss.resteasy.reactive.server.ServerResponseFilter;

import java.util.UUID;

public class CorrelationIdFilters {
    public static final String HEADER = "X-Correlation-ID";
    public static final String MDC_KEY = "correlationId";

    @ServerRequestFilter(priority = 100)
    public void request(ContainerRequestContext req) {
        String id = req.getHeaderString(HEADER);
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
            req.getHeaders().putSingle(HEADER, id);
        }
        MDC.put(MDC_KEY, id);
        req.setProperty(MDC_KEY, id);
    }

    @ServerResponseFilter
    public void response(ContainerRequestContext req, ContainerResponseContext res) {
        Object id = req.getProperty(MDC_KEY);
        if (id != null) {
            res.getHeaders().putSingle(HEADER, id.toString());
        }
        MDC.remove(MDC_KEY);
    }
}
